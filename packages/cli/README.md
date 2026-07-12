# mindr

**Give AI coding agents persistent memory of your codebase.**

AI coding agents are stateless by default — every session starts from zero, re-learning the same codebase, repeating the same mistakes. Mindr fixes this with a git-aware, tree-sitter-powered memory layer that works with Claude Code, Codex, Cursor, Aider, OpenCode, and any MCP-compatible agent.

[![npm](https://img.shields.io/npm/v/mindr)](https://www.npmjs.com/package/mindr)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/emartai/mindr/blob/main/LICENSE)

## Install

```bash
npm install -g mindragent
```

## 60-second demo

```bash
cd my-project
mindragent init                      # scan repo, install git hook, detect conventions

mindragent generate agents-md        # auto-generate AGENTS.md from observed patterns
mindragent generate claude-md        # auto-generate CLAUDE.md

mindragent remember "We use tRPC for all internal APIs" --type decision
mindragent memory list
mindragent status
```

## MCP setup (Claude Code)

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "mindr": { "command": "mindragent", "args": ["serve"] }
  }
}
```

Every new session now gets automatic context — decisions, conventions, hot modules, active debt — injected before the first message.

## CLI reference

```
mindragent init                       Set up Mindr in current repo
mindragent remember <text>            Store a memory manually
mindragent forget <id>                Delete a memory
mindragent memory list                Browse stored memories
mindragent decisions                  Browse architectural decisions
mindragent replay                     Chronological decision timeline
mindragent debt list                  Browse technical debt
mindragent debt add <text>            Add a debt item manually
mindragent bugs                       Browse bug pattern memory
mindragent branch status              Branch-aware memory view
mindragent session health             Context pollution score
mindragent stats                      Token savings report
mindragent generate agents-md         Generate AGENTS.md
mindragent generate claude-md         Generate CLAUDE.md
mindragent serve                      Start MCP server
mindragent ui                         Open local dashboard (localhost:3131)
mindragent status                     Health check
mindragent migrate                    Migrate SQLite → Remembr cloud
mindragent config get <key>           Read config value
mindragent config set <key> <value>   Write config value
```

## Documentation

Full docs, integration guides, and SDK reference: [github.com/emartai/mindr](https://github.com/emartai/mindr)

## License

MIT
