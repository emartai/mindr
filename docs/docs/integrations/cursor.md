# Cursor

Mindr integrates with Cursor via MCP. Cursor's agent calls Mindr tools to load project context before coding.

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

**3. Register Mindr as an MCP server in Cursor.**

Open Cursor settings (`Ctrl+Shift+J` / `Cmd+Shift+J`), go to **Features → MCP Servers**, and add:

```json
{
  "mindr": {
    "command": "mindr",
    "args": ["serve"]
  }
}
```

Or edit `~/.cursor/mcp.json` directly:

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

**4. Restart Cursor.** The Mindr tools will appear in the MCP tools list.

## Verify

Open the Cursor chat panel and type:

```text
Use mindr:get_context to load project context
```

Cursor's agent will call the tool and display the context block.

## Available tools

All 8 Mindr MCP tools are available: `mindr:get_context`, `mindr:remember`, `mindr:query`, `mindr:get_debt`, `mindr:get_conventions`, `mindr:check_for_bug_patterns`, `mindr:context_health`, `mindr:checkpoint`.
