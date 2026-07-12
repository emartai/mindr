# Architecture

## Package overview

Mindr is a TypeScript monorepo with three published packages:

| Package | npm name | Role |
|---------|----------|------|
| `packages/core` | `@emartai/mindr-core` | Storage, git integration, analysis, context |
| `packages/sdk` | `@emartai/mindr` | Clean TypeScript API wrapping core |
| `packages/cli` | `mindragent` | CLI commands + MCP server + local UI |

The CLI and SDK both depend on core. They never depend on each other.

## Memory model

A `MindrMemory` has three parts:

- **content** — plain text describing what was learned
- **tags** — key/value pairs for filtering (`type`, `module`, `language`, `severity`, etc.)
- **metadata** — arbitrary JSON for richer data (file path, line number, commit SHA, confidence score, etc.)

Tags use the wire format `mindr:<key>:<value>`. `packages/core/src/schema.ts` is the conversion boundary between wire format and the `{ key, value }` objects the rest of the codebase uses.

Memory types: `decision`, `convention`, `bug_pattern`, `debt`, `debt_resolved`, `session_checkpoint`, `note`, `context`.

## Storage layer

The `MemoryBackend` interface (`packages/core/src/storage/backend.ts`) has five methods:

```
store(input)           → MindrMemory
search({ query, ... }) → MindrMemory[]
forget(id)             → void
listByTags(tags, limit)→ MindrMemory[]
searchByCommitSet(shas) → MindrMemory[]
getById(id)            → MindrMemory | null
```

Two implementations ship out of the box:

**SQLiteBackend** — uses `better-sqlite3` with WAL mode and FTS5 full-text search. Zero config; file lives at `.mindr/mindr.sqlite`. Default for all local installs.

**RemembrBackend** — wraps `@remembr/sdk`. Stores memories in the Remembr cloud. Enables cross-machine context sharing and semantic search. Requires `remembr.base_url` and `remembr.api_key` in config (or `REMEMBR_API_KEY` env var).

`packages/core/src/storage/factory.ts` reads the config and returns the correct backend. The rest of the system only sees `MemoryBackend`; it never imports a concrete class.

## Git integration

**Post-commit hook** (`packages/core/src/git/hooks.ts`) — `mindragent init` installs a hook at `.git/hooks/post-commit`. On every commit it runs `mindragent internal process-commit`, which calls the watcher.

**Watcher** (`packages/core/src/git/watcher.ts`) — `onCommit(backend, repoRoot, sha)` processes a single commit:

1. Reads the diff stat and commit metadata
2. Scores five trigger signals: keyword match, large cross-module diff, new top-level directory, dependency file change, import pattern change
3. If confidence ≥ 0.15, stores a `decision` memory with the confidence score and trigger list
4. Scans the diff for `TODO`/`FIXME`/`HACK`/`XXX` markers and stores `debt` memories
5. If the commit message contains `fix:` or `fix(...)`, creates a bug fingerprint from the pre-fix AST and stores a `bug_pattern` memory

**Lineage tracking** (`packages/core/src/git/lineage.ts`) — memories are tagged with the branch they were written on. When querying on a different branch, Mindr falls back to memories reachable from the shared commit ancestry, avoiding ghost memories from stale branches.

## Convention detection

`packages/core/src/conventions/detector.ts` uses Tree-sitter to walk ASTs and detect:

- **Identifier style** — camelCase, snake_case, PascalCase, SCREAMING_SNAKE_CASE (functions, variables, classes)
- **File naming** — kebab-case, snake_case, camelCase, PascalCase
- **Test patterns** — `.test.ts`, `_test.go`, `test_*.py`, `.spec.ts`
- **Import grouping** — whether imports are grouped or mixed
- **Error handling style** — typed catch vs. generic, specific vs. bare `except`

Supported languages: TypeScript, JavaScript, Python, Go, Rust.

Each language produces a `ConventionProfile` with a consistency score per pattern (0–100%). Profiles are stored as `convention` memories and injected into session context.

## Bug fingerprinting

`packages/core/src/bugs/fingerprint.ts` computes structural hashes of function bodies using Tree-sitter. The hash captures control flow shape (if/else, try/catch, loops) while ignoring literals and variable names. On a fix commit, the pre-fix shape is stored as a `bug_pattern`. Future code is matched against stored patterns — a match triggers a warning.

## Session context assembly

`packages/core/src/context/builder.ts` — `buildSessionContext(backend, opts)`:

1. Reads stack, conventions, decisions, active debt, and recent session activity from the backend
2. Ranks memories by quality score
3. Assembles a structured text block (`=== MINDR CONTEXT ===`)
4. Trims to a token budget by dropping lowest-priority sections first: warnings → hot modules → decisions → conventions → stack

The context object also exposes structured fields (`ctx.stack`, `ctx.decisions`, `ctx.conventions`, `ctx.warnings`) for programmatic use.

## Context health

`packages/core/src/context/health.ts` — `scoreContextHealth(session)` scores session drift 0–100 by penalising:

| Signal | Max penalty |
|--------|-------------|
| Modules touched beyond 2 | 24 |
| Files touched beyond 8 | 20 |
| Off-task file ratio | 25 |
| Elapsed time beyond 90 min | 15 |
| Topic spread (caller-supplied) | 16 |

Scores ≥ 70 are OK. 40–69 suggest a checkpoint. Below 40 recommends a fresh session.

## Quality scoring

`packages/core/src/quality/score.ts` — `scoreMemoryQuality(memory)` returns a 0–100 score from five deterministic components:

| Component | Max | Logic |
|-----------|-----|-------|
| Recency | 40 | Decays linearly over 30 days |
| Commit association | 25 | Has a `git_commit` tag |
| Manual capture | 20 | `role = 'user'` |
| Retrieval frequency | 10 | Count of `retrieve` metadata field |
| Contradiction penalty | −25 | Tagged `reversed_decision` |

Higher-quality memories are surfaced first in context injection and `memory list --sort quality`.

## MCP server

`packages/cli/src/mcp/server.ts` — `createMindrServer(backend)` exposes 7 tools over the Model Context Protocol stdio transport:

| Tool | Description |
|------|-------------|
| `mindr:get_context` | Full session context block |
| `mindr:remember` | Store a manual memory |
| `mindr:query` | List memories by type/module/date |
| `mindr:get_debt` | List active debt items |
| `mindr:get_conventions` | List detected convention profiles |
| `mindr:check_for_bug_patterns` | Fingerprint code against stored patterns |
| `mindr:context_health` | Score session drift |
| `mindr:checkpoint` | Write a session checkpoint |

`mindragent serve` starts the server on stdio. Any MCP-compatible agent can connect via the standard tool-calling protocol.

## Local UI

`packages/cli/src/ui/server.ts` — `mindragent ui` starts an HTTP server at `http://127.0.0.1:3131`. It serves read-only pages for Overview, Memories, Decisions, Conventions, Technical Debt, and Sessions, backed directly by the same storage backend. Restricted to localhost — remote connections are rejected with 403.

## Data flow diagram

```
git commit
    │
    ▼
post-commit hook
    │
    ▼
mindragent internal process-commit
    │
    ├── watcher.onCommit()
    │       ├── detect decisions (5 trigger signals)
    │       ├── detect debt (regex on diff)
    │       └── create bug fingerprint (if fix commit)
    │
    ▼
MemoryBackend.store()
    │
    ├── SqliteBackend  (.mindr/mindr.sqlite)
    └── RemembrBackend (Remembr cloud API)
            │
            ▼
        Agent session
            │
        mindr:get_context
            │
        buildSessionContext()
            │
        === MINDR CONTEXT ===
            ...
        === END CONTEXT ===
```
