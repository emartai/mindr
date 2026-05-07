# Claude Code

Mindr integrates with Claude Code via the Model Context Protocol (MCP). Claude calls Mindr tools automatically at session start and during coding to stay oriented in the codebase.

## Setup

**1. Install Mindr:**

```bash
npm install -g mindragent
```

**2. Initialize Mindr in your project:**

```bash
cd my-project
mindr init
```

**3. Add the MCP server to Claude Code settings.**

For a single project, create or edit `.claude/settings.json` in your project root:

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

For all projects globally, add the same block to `~/.claude/settings.json`.

**4. Start a new Claude Code session.** Claude will now have access to Mindr tools.

## Available tools

Claude Code can call these tools automatically:

| Tool | When Claude uses it |
| --- | --- |
| `mindr:get_context` | Session start — loads stack, conventions, decisions, warnings |
| `mindr:remember` | After discussing an architectural decision |
| `mindr:query` | When looking up prior decisions or debt |
| `mindr:get_debt` | When asked about technical debt |
| `mindr:get_conventions` | When unsure about naming style |
| `mindr:check_for_bug_patterns` | Before writing code similar to known bugs |
| `mindr:context_health` | When session has been long or touched many files |
| `mindr:checkpoint` | Before a major context switch |

## What Claude receives

At the start of a session, `mindr:get_context` returns:

```text
=== MINDR CONTEXT ===

## Stack
- TypeScript, Express, PostgreSQL

## Conventions (typescript)
- camelCase functions: 97%
- PascalCase classes: 100%

## Recent Decisions
- [2026-05-01] [api] Switch internal APIs to tRPC
- [2026-04-15] [auth] JWT + Redis refresh tokens

## Warnings
⚠ FIXME src/billing/invoice.ts:47 — retry logic (high, 43d)

=== END CONTEXT ===
```

Claude reads this before answering your first question.

## Scoped context

Ask Claude to load context for a specific module:

```text
Load Mindr context for the auth module
```

Claude will call `mindr:get_context` with `{ "module": "auth" }` and receive only auth-relevant context.

## Storing decisions

When Claude makes a decision in your conversation, you can ask it to remember:

```text
Remember that we decided to use Zod for all validation
```

Claude will call `mindr:remember` with `type: "decision"` and the content you specified.

## Viewing what Mindr knows

Run `mindr status` in your terminal to see memory counts, or open the local dashboard:

```bash
mindr ui
```

Then visit `http://127.0.0.1:3131` in your browser.
