# Mindr documentation

Mindr gives your AI coding agents a persistent memory of your codebase. A post-commit git
hook learns your conventions, decisions, and technical debt, then serves that context to any
agent over the Model Context Protocol — or writes it into `AGENTS.md` / `CLAUDE.md`.

New here? Start with **[Why Mindr](./why-mindr.md)** for the motivation, or jump straight to the
**[Quickstart](./quickstart.md)**.

:::tip Open source & local-first
Mindr is MIT-licensed and part of [Emart AI](https://github.com/emartai). It runs on local SQLite
by default — zero config, no account, nothing leaves your machine. Scale to
[Remembr](./self-hosting.md) when you need cross-machine, cross-team memory.
:::

## Popular pages

- **[Quickstart](./quickstart.md)** — install, initialize, and connect your agent in a few minutes
- **[CLI Reference](./cli.md)** — every command and flag
- **[SDK Reference](./sdk.md)** — programmatic access from TypeScript
- **[Architecture](./architecture.md)** — how the capture → store → serve pipeline works

## Connect your agent

Mindr speaks MCP, so one memory works across tools:
[Claude Code](./integrations/claude-code.md), [Cursor](./integrations/cursor.md),
[Codex](./integrations/codex.md), [Aider](./integrations/aider.md),
[Windsurf](./integrations/windsurf.md), [Continue](./integrations/continue-dev.md), and
[OpenCode](./integrations/opencode.md).

## Concepts

Deep dives on the [memory schema](./concepts/memory-schema.md),
[branch-aware memory](./concepts/branch-aware-memory.md),
[conventions](./concepts/conventions.md), [decisions](./concepts/decisions.md),
[bug patterns](./concepts/bug-patterns.md), [technical debt](./concepts/debt.md),
[quality score](./concepts/quality-score.md), and [context health](./concepts/context-health.md).
