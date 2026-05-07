# Codex CLI

Mindr integrates with OpenAI Codex CLI via MCP.

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

**3. Add the MCP server to your Codex configuration.**

Edit `~/.codex/config.toml` (or create it):

```toml
[[mcp_servers]]
name    = "mindr"
command = "mindr serve"
```

Or in YAML format (`~/.codex/config.yaml`):

```yaml
mcp_servers:
  - name: mindr
    command: mindr serve
```

**4. Start a new Codex session.** The Mindr tools will be available automatically.

## Verify

In a Codex session:

```text
call mindr:get_context to load project context
```

Codex will call the tool and display the context block before your first coding request.

## Available tools

All 8 Mindr MCP tools are available: `mindr:get_context`, `mindr:remember`, `mindr:query`, `mindr:get_debt`, `mindr:get_conventions`, `mindr:check_for_bug_patterns`, `mindr:context_health`, `mindr:checkpoint`.
