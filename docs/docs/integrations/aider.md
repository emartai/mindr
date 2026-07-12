# Aider

Mindr integrates with Aider via MCP. Aider's MCP support requires a bridge; the recommended approach is `aider-mcp` or similar MCP-to-Aider adapters.

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

**3. Start `mindr serve` alongside Aider.**

In one terminal:

```bash
mindr serve
```

**4. Configure the MCP bridge** you use for Aider to point at `mindr serve`. Refer to your MCP bridge's documentation for the exact config format. The MCP server communicates on stdio.

## Alternative: inject context manually

If you do not have an MCP bridge, you can inject Mindr context into Aider's system prompt directly:

```bash
# Generate context and pipe to Aider
mindr generate agents-md
aider --read AGENTS.md
```

Or use `--system-prompt`:

```bash
mindr_context=$(mindr generate agents-md --output /dev/stdout 2>/dev/null)
aider --system-prompt "$mindr_context"
```

This is simpler but static — context is not updated mid-session.

## Available tools

All 8 Mindr MCP tools are available when using an MCP bridge: `mindr:get_context`, `mindr:remember`, `mindr:query`, `mindr:get_debt`, `mindr:get_conventions`, `mindr:check_for_bug_patterns`, `mindr:context_health`, `mindr:checkpoint`.
