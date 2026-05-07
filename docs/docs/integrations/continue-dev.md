# Continue

Mindr integrates with Continue (the open-source AI coding assistant) via MCP.

## Setup

**1. Install Mindr:**

```bash
npm install -g mindragent
```

**2. Initialize Mindr in your project:**

```bash
cd my-project
mindragent init
```

**3. Add Mindr as an MCP server in Continue's config.**

Edit `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "mindr",
      "command": "mindragent",
      "args": ["serve"]
    }
  ]
}
```

Or if you are using YAML config (`~/.continue/config.yaml`):

```yaml
mcpServers:
  - name: mindr
    command: mindragent
    args:
      - serve
```

**4. Reload Continue.** The Mindr tools will appear in the tools list.

## Verify

In the Continue chat panel, type:

```text
@mindr get_context
```

or ask Continue's agent to call the tool directly. The context block will be displayed before Continue answers.

## Available tools

All 8 Mindr MCP tools are available: `mindr:get_context`, `mindr:remember`, `mindr:query`, `mindr:get_debt`, `mindr:get_conventions`, `mindr:check_for_bug_patterns`, `mindr:context_health`, `mindr:checkpoint`.
