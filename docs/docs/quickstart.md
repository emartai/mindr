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

This writes `AGENTS.md` to your project root. Agents read it at session start. Re-run it after major decisions to keep it fresh.

## What agents receive

When an agent calls `mindr:get_context`, it receives:

```
=== MINDR CONTEXT ===

## Stack
- TypeScript, Express, PostgreSQL
- tRPC (internal), REST (external)

## Conventions (typescript)
- camelCase functions: 97%
- PascalCase classes: 100%
- kebab-case files: 89%

## Recent Decisions
- [2026-05-01] [api] Switch internal APIs to tRPC
- [2026-04-15] [auth] JWT + Redis refresh tokens

## Warnings
⚠ FIXME src/billing/invoice.ts:47 — retry logic (high, 43d)

=== END CONTEXT ===
```

## Next steps

- [CLI Reference](./cli.md) — all commands and flags
- [SDK Reference](./sdk.md) — programmatic access from TypeScript
- [Architecture](./architecture.md) — how Mindr works
