# Quickstart

## Prerequisites

- Node.js 22 or higher
- A git repository (`git init` if you don't have one)

## Install

```bash
npm install -g mindragent
```

## Initialize Mindr

Run `mindr init` in your project root:

```bash
cd my-project
mindr init
```

You will be prompted to choose a storage backend:

| Option | Description |
|--------|-------------|
| **Local SQLite** | Zero-config. Stores memories in `.mindr/mindr.sqlite`. Best for solo or small team use. |
| **Remembr cloud** | Cross-machine persistence. Requires a Remembr base URL and API key. |

For most projects, SQLite is the right choice. You can migrate later with `mindr migrate sqlite-to-remembr`.

After init, Mindr:
1. Creates `.mindr/config.toml`
2. Installs a `post-commit` git hook that processes every commit automatically
3. Runs an initial convention scan across your codebase

```
✓ Mindr initialized

  Backend: sqlite
  Config:  /my-project/.mindr/config.toml
  Hook:    /my-project/.git/hooks/post-commit
```

## Verify

```bash
mindr status
```

Output shows backend type, hook status, and memory counts per type.

## Connect your agent

### Claude Code

Add to `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global):

```json
{
  "mcpServers": {
    "mindr": {
      "command": "mindr",
      "args": ["serve"]
    }
  }
}
```

Restart Claude Code. On the next session, Claude will call `mindr:get_context` automatically and receive your stack, conventions, and recent decisions as structured context.

### Other agents

See [Cursor](./integrations/cursor.md), [Codex](./integrations/codex.md), [Continue](./integrations/continue-dev.md), [Aider](./integrations/aider.md), [OpenCode](./integrations/opencode.md), and [Windsurf](./integrations/windsurf.md).

## Your first memories

Make a commit with a meaningful message. The post-commit hook processes it automatically:

```bash
git add .
git commit -m "Switch internal APIs from REST to tRPC for better type safety"
```

Mindr detects keywords like `switch`, `migrate`, `refactor`, dependency changes, and new directory structures, then stores a decision memory with a confidence score.

You can also store memories manually:

```bash
mindr remember "We use tRPC for all internal APIs" --type decision --module api
mindr remember "JWT expiry is 15m; refresh tokens live in Redis" --type decision --module auth
```

## Generate AGENTS.md

After a few commits or manual memories, generate a structured snapshot:

```bash
mindr generate agents-md
```

This writes `AGENTS.md` to your project root, leading with an auto-detected
**Commands** section — build, test, run, and lint pulled from your `package.json`
scripts, `Makefile`, or language conventions (`pytest`, `go test`, `cargo`) — followed
by your stack, conventions, recent decisions, and active warnings. In a polyglot
monorepo, per-package commands are listed scoped by directory (e.g. `cd server && pytest`).

Prefer Claude Code's format, or want both?

```bash
mindr generate claude-md     # CLAUDE.md
mindr generate --all         # AGENTS.md + CLAUDE.md
```

Agents read these at session start. Re-run after major decisions to keep them fresh.

## What agents receive

When an agent calls `mindr:get_context`, it receives a compact, priority-ordered brief
that is trimmed to fit a token budget:

```text
=== MINDR CONTEXT ===

[WARNINGS]
  FIXME `src/billing/invoice.ts:47` — retry logic

[RECENT DECISIONS]
  2026-05-01 — switch internal APIs to tRPC [keyword]
  2026-04-15 — JWT + Redis refresh tokens [keyword]

[COMMANDS]
  Install: pnpm install
  Build:   pnpm build
  Test:    pnpm test
  Lint:    pnpm lint

[CONVENTIONS]
  typescript: functionNames=camelCase(97%), classNames=PascalCase(100%), fileNames=kebab-case(89%)

[STACK OVERVIEW]
  Languages: TypeScript
  Stack: Express, PostgreSQL, tRPC
  Hot modules: api (12), auth (7)

=== END CONTEXT ===
```

## Next steps

- [CLI Reference](./cli.md) — all commands and flags
- [SDK Reference](./sdk.md) — programmatic access from TypeScript
- [Architecture](./architecture.md) — how Mindr works
