# Windsurf

Mindr integrates with Windsurf (by Codeium) via MCP.

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

**3. Add Mindr to Windsurf's MCP configuration.**

Open Windsurf settings, navigate to **AI → MCP Servers**, and add a new server:

- **Name:** `mindr`
- **Command:** `mindr`
- **Args:** `serve`

Or edit `~/.codeium/windsurf/mcp_config.json` directly:

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

**4. Restart Windsurf.** The Mindr tools will appear in Cascade's tool list.

## Verify

In Cascade, type:

```text
Use mindr:get_context to load project context
```

Cascade will call the tool and display the context block.

## Available tools

All 8 Mindr MCP tools are available: `mindr:get_context`, `mindr:remember`, `mindr:query`, `mindr:get_debt`, `mindr:get_conventions`, `mindr:check_for_bug_patterns`, `mindr:context_health`, `mindr:checkpoint`.
