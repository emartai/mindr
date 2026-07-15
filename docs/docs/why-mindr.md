# Why Mindr

## The problem: agents start every session blind

:::danger Agent amnesia
Modern AI agents work in isolated context windows. When a new session starts, the agent has
lost every prior refactor, every "why" decision, and every preference you established. The
result: regressive bugs, circular reasoning, and hours of manual re-prompting.
:::

A coding agent's context window resets between sessions. Every time you open a new
conversation, the agent re-derives the same things you told it yesterday:

- What language, framework, and database this project uses
- How you name functions, files, and tests
- Why you switched from REST to tRPC three weeks ago
- Which files have known FIXMEs it should be careful around
- How to actually build, test, and lint the project

So you re-explain. Or the agent guesses — inconsistently — and you correct it. Again.
That re-orientation tax is paid on every session, by every teammate, forever.

## The usual workarounds don't hold

| Approach | Why it falls short |
|----------|--------------------|
| **Hand-written `AGENTS.md` / `CLAUDE.md`** | Accurate on day one, stale by month two. Nobody updates it after every decision. |
| **Longer prompts** | Burns tokens re-describing the codebase, and still can't recall *why* past decisions were made. |
| **RAG over the whole repo** | Retrieves code, not the reasoning, conventions, or debt behind it — the things that aren't in any single file. |

## How Mindr is different

Mindr treats memory as a byproduct of the work you already do. A post-commit hook reads
each commit and extracts durable, structured memory — then serves it to any agent over MCP
or writes it into `AGENTS.md` / `CLAUDE.md`.

- **Automatic.** No prompting and no manual note-taking. Commit as usual; memory accrues.
- **Structured, not retrieved.** Conventions (with confidence scores), decisions (with the
  triggering commit), debt (aged and severity-ranked), and bug patterns — not raw file chunks.
- **Self-maintaining.** Debt is marked resolved when you delete the marker; conventions
  re-derive as the codebase evolves. The context never goes stale.
- **Agent-agnostic.** One MCP server for Claude Code, Cursor, Codex, Aider, Windsurf,
  Continue, and OpenCode. Bring whatever tool your team uses.
- **Local-first.** SQLite by default — zero config, nothing leaves your machine. Move to
  [Remembr](./self-hosting.md) later for cross-machine, cross-team persistence.

## Before and after

**Before** — a fresh session, every time:

```text
You:   We use tRPC for internal APIs, REST for external. camelCase functions,
       PascalCase classes. Tests live next to source as *.test.ts. Auth is JWT
       with Redis refresh tokens. Don't touch billing/invoice.ts:47 — the retry
       logic is broken. Build with pnpm, test with pnpm test...
Agent: Got it. (…until the next session, when you say it all again.)
```

**After** — the agent reads it in one call:

```text
=== MINDR CONTEXT ===

[RECENT DECISIONS]
  2026-05-01 — migrate auth to JWT + Redis [keyword]
  2026-04-15 — switch internal APIs to tRPC [keyword]

[COMMANDS]
  Install: pnpm install
  Test:    pnpm test

[CONVENTIONS]
  typescript: functionNames=camelCase(97%), classNames=PascalCase(100%)

[WARNINGS]
  FIXME `src/billing/invoice.ts:47` — retry logic (high, 43d)

=== END CONTEXT ===
```

## When Mindr is a good fit

- You use one or more AI coding agents and re-explain your codebase to them often.
- You want a living `AGENTS.md` that stays correct without manual upkeep.
- You care about *why* past decisions were made, not just what the code says today.

Ready? Head to the [Quickstart](./quickstart.md).
