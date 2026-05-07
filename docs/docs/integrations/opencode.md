# OpenCode

Mindr integrates with OpenCode via MCP.

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

**3. Add Mindr to `opencode.json`.**

Create or edit `opencode.json` in your project root (or `~/.opencode/opencode.json` globally):

```json
{
  "mcp": {
    "servers": {
      "mindr": {
        "command": "mindr",
        "args": ["serve"]
      }
    }
  }
}
```

**4. Start a new OpenCode session.** Mindr tools will be available in the agent's tool set.

## Verify

Ask the OpenCode agent:

```text
Use mindr:get_context to show me what Mindr knows about this project
```

## Available tools

All 8 Mindr MCP tools are available: `mindr:get_context`, `mindr:remember`, `mindr:query`, `mindr:get_debt`, `mindr:get_conventions`, `mindr:check_for_bug_patterns`, `mindr:context_health`, `mindr:checkpoint`.
