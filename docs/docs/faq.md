# FAQ

## General

### Does Mindr embed code?

No. Mindr never sends your code to an embedding model. Convention detection and bug fingerprinting happen locally using Tree-sitter ASTs. If you use the Remembr backend, Remembr handles its own embeddings on the memory text — not your source code.

### Does Mindr block agents?

No. Bug pattern matches, debt warnings, and context health scores are all advisory. Mindr reports what it finds; the agent decides what to do.

### Does Mindr send my source code anywhere?

No. The post-commit hook runs locally. Mindr only stores the text content you give it — commit messages, `mindragent remember` content, detected TODO/FIXME markers, and convention summary text. No source code is stored or transmitted.

### Which agents does Mindr work with?

Any agent that supports the [Model Context Protocol](https://modelcontextprotocol.io) (MCP). This includes Claude Code, Cursor, Continue, Aider (via MCP bridge), OpenCode, Codex CLI, and Windsurf. See the [integrations](./integrations/claude-code.md) section for config snippets.

## Storage

### What is the difference between SQLite and Remembr backends?

**SQLite** stores memories in `.mindr/mindr.sqlite` on your local machine. Zero setup. Memories are scoped to one machine; you lose them if you delete the file or switch machines.

**Remembr** stores memories in the cloud. Memories persist across machines and can be searched semantically. Requires a Remembr API key and base URL.

You can start with SQLite and migrate later:

```bash
mindragent config set storage.backend remembr
mindragent config set remembr.base_url https://api.remembr.io
mindragent migrate sqlite-to-remembr
```

### Can I back up my memories?

With SQLite, copy `.mindr/mindr.sqlite`. With Remembr, your data is stored in their cloud.

### How do I wipe memories and start fresh?

```bash
rm .mindr/mindr.sqlite
mindragent init
```

Or with Remembr, use the Remembr dashboard to delete memories.

## Git integration

### Does Mindr work without git?

`mindragent init` requires a git repository. The post-commit hook won't fire without git. You can still use the SDK and CLI manually to store memories, but automatic decision detection requires commits.

### What happens when I merge a branch?

Memories are associated with commit SHAs. When you merge a feature branch into main, the memories from that branch become reachable from main automatically — no action required.

### Will I get duplicate memories after a merge?

No. Mindr uses lineage tags to track which branch a memory was written on. When querying from main, it returns memories reachable from the current commit graph, deduplicating by commit SHA.

### The post-commit hook isn't running. How do I fix it?

Run `mindragent status` to check if the hook is installed. If it shows "not installed", run:

```bash
mindragent init
```

`init` is idempotent — it won't overwrite your existing config, but it will reinstall the hook.

## Context and agents

### How much context does Mindr inject?

The default `mindr:get_context` response is token-unlimited. Pass `max_tokens` to trim it:

```json
{ "name": "mindr:get_context", "arguments": { "max_tokens": 2000 } }
```

Mindr drops sections in priority order — warnings first, then hot modules, decisions, conventions, and finally stack — to fit the budget.

### What is context health?

Context health (0–100) measures how focused the current session is. Touching many modules, many files, or running for a long time all lower the score. A score below 40 means the session has drifted; start a fresh one with `mindragent session checkpoint <id>`.

### How does Mindr know what module a memory belongs to?

Mindr infers modules from directory names. If a file in a commit lives under `src/auth/`, the module is tagged `auth`. You can override this with `--module` when using `mindragent remember`.

## Decisions

### How does Mindr decide a commit is a "decision"?

It scores five signals:

1. **Keyword match** (weight 0.40) — commit message contains "refactor", "switch", "migrate", "chose", "decided", "architecture", "replace", etc.
2. **Large cross-module diff** (weight 0.25) — > 100 lines changed across ≥ 2 module directories
3. **New top-level directory** (weight 0.30) — a new `src/*` directory appears
4. **Dependency change** (weight 0.15) — `package.json`, `Cargo.toml`, `go.mod`, or `pyproject.toml` changes
5. **Import pattern change** (weight 0.25) — ≥ 5 files add the same new import

Confidence is the sum of triggered weights, clamped to [0, 1]. Commits with confidence ≥ 0.15 are stored as decisions.

### Can I manually mark or unmark a decision?

Yes. To store a decision manually:

```bash
mindragent remember "Chose PostgreSQL over MongoDB for ACID guarantees" --type decision --module db
```

To mark an existing decision as reversed (superseded):

```bash
mindragent decisions reverse <decision-id>
```

Reversed decisions still appear in `decisions list` but are struck through in the table.

## Technical debt

### Where does Mindr look for debt markers?

In git diffs, on every commit. It scans for `TODO`, `FIXME`, `HACK`, `XXX`, and `TECH-DEBT` in added lines. Severity is inferred deterministically — `HACK`, `FIXME`, and `XXX` are `high`; `TODO` and `TECH-DEBT` are `medium`.

### How do I resolve debt?

```bash
mindragent debt resolve <debt-id>
```

This stores a `debt_resolved` marker. The original debt memory is not deleted — it remains for audit purposes.

## Conventions

### Which languages does convention detection support?

TypeScript, JavaScript, Python, Go, and Rust. Support for additional languages can be added by contributing a Tree-sitter grammar to `packages/core/src/conventions/languages.ts`.

### How often are conventions updated?

On every commit, if files in a supported language are touched. The convention detector runs incrementally over changed files and updates the stored `convention` memory for that language.

### What happens if the codebase is inconsistent?

Mindr reports the consistency score honestly. A score of 60% for `camelCase functions` means 60% of observed functions use camelCase — the convention is real but not enforced. Use it as a signal, not a rule.
