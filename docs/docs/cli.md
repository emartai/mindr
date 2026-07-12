# CLI Reference

Install the CLI globally:

```bash
npm install -g mindr
```

The binary is `mindr`. All commands discover the project root by walking up from `cwd` to find `.mindr/config.toml`.

---

## mindr init

Initialize Mindr in the current git repository.

```bash
mindr init
```

Interactive prompts select a storage backend (SQLite or Remembr). Creates `.mindr/config.toml`, installs the post-commit hook, and runs an initial convention scan.

**Requirements:** must be inside a git repository.

---

## mindr remember

Store a manual memory.

```bash
mindr remember "<content>" [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--type <type>` | Memory type: `decision`, `convention`, `bug_pattern`, `debt`, `note`, `context` |
| `--module <name>` | Module or area this memory belongs to (e.g. `auth`, `api`) |
| `--tag <k:v>` | Extra tag as `key:value` (repeatable) |

**Examples:**

```bash
mindr remember "Switched from REST to tRPC for internal APIs" --type decision --module api
mindr remember "JWT access tokens expire in 15 minutes" --type note --module auth
mindr remember "billing retry loop is temporary" --type debt --module billing --tag severity:high
```

---

## mindr forget

Soft-delete a memory by ID.

```bash
mindr forget <id>
```

The memory is marked deleted and excluded from all future queries. Pass the full ID or a prefix — any unique prefix is accepted.

---

## mindr memory list

List stored memories in a table.

```bash
mindr memory list [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--type <type>` | Filter by memory type |
| `--module <name>` | Filter by module tag |
| `--since <date>` | Only show memories created on or after this date (ISO or `YYYY-MM-DD`) |
| `--limit <n>` | Max results (default 50) |
| `--sort quality` | Sort by quality score descending |
| `--json` | Output raw JSON array |

**Example:**

```bash
mindr memory list --type decision --module api --since 2026-01-01
```

---

## mindr memory inspect

Print full JSON for a single memory, including quality breakdown.

```bash
mindr memory inspect <id>
```

---

## mindr decisions

List decision memories in a table with confidence scores and triggers.

```bash
mindr decisions [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--module <name>` | Filter by module |
| `--from <date>` | On or after date |
| `--to <date>` | On or before date |
| `--limit <n>` | Max results (default 50) |
| `--json` | Output raw JSON array |

---

## mindr decisions reverse

Mark a decision as reversed (superseded by a later decision). The decision remains visible but is struck through in `decisions list` output.

```bash
mindr decisions reverse <id>
```

---

## mindr replay

Show decisions in chronological order (oldest first). Useful for reviewing how the codebase evolved.

```bash
mindr replay [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--module <name>` | Filter by module |
| `--from <date>` | On or after date |
| `--to <date>` | On or before date |
| `--show-reversed` | Show reversed decisions with strikethrough |
| `--json` | Output raw JSON array |

---

## mindr branch status

Show memory activity scoped to the current git branch: branch-specific memories, reachable memories from the last 90 days, and shared memories from the default branch.

```bash
mindr branch status [--json]
```

---

## mindr bugs list

List stored bug-pattern memories (fingerprints of pre-fix function shapes).

```bash
mindr bugs list [--module <name>] [--json]
```

---

## mindr debt list

List active technical debt items.

```bash
mindr debt list [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--severity <level>` | Filter by `high`, `medium`, or `low` |
| `--module <name>` | Filter by module |
| `--age <days>` | Only show items older than N days |
| `--json` | Output raw JSON array |

---

## mindr debt add

Manually record a technical debt item.

```bash
mindr debt add "<text>" --file <path> [--severity <level>]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--file <path>` | Source file path (required) |
| `--severity <level>` | `high`, `medium`, or `low` (default `medium`) |

**Example:**

```bash
mindr debt add "Temporary retry loop — replace with queue" --file src/billing/invoice.ts --severity high
```

---

## mindr debt resolve

Mark a debt item as resolved.

```bash
mindr debt resolve <id>
```

Stores a `debt_resolved` marker. The original debt memory is preserved for audit purposes.

---

## mindr debt report

Print a markdown table summarising debt by module and severity.

```bash
mindr debt report
```

---

## mindr session health

Score context health for a session (0–100). A score below 40 means the session has drifted; consider starting fresh.

```bash
mindr session health <session-id>
```

Output (JSON):

```json
{
  "score": 72,
  "recommendation": "ok",
  "breakdown": {
    "modules": 0,
    "files": 4,
    "offTask": 0,
    "time": 5,
    "topicSpread": 0
  }
}
```

---

## mindr session checkpoint

Write a checkpoint memory for a session. Useful before switching context.

```bash
mindr session checkpoint <session-id>
```

---

## mindr stats

Show token metering and estimated savings.

```bash
mindr stats [--session <id>] [--last <window>]
```

`--last` accepts `30m`, `2h`, `7d`, `2w` (minutes, hours, days, weeks).

---

## mindr status

Show Mindr status: backend type, git hook status, last processed commit, and per-type memory counts.

```bash
mindr status [--json]
```

---

## mindr config get

Read a config value by dotted key.

```bash
mindr config get <key>
```

**Examples:**

```bash
mindr config get storage.backend
mindr config get remembr.base_url
```

---

## mindr config set

Write a config value by dotted key.

```bash
mindr config set <key> <value>
```

**Examples:**

```bash
mindr config set storage.backend remembr
mindr config set remembr.base_url https://api.remembr.io
```

---

## mindr generate agents-md

Generate `AGENTS.md` from observed patterns and stored memories.

```bash
mindr generate agents-md [-o <path>] [--force]
```

**Options:**

| Flag | Description |
| --- | --- |
| `-o, --output <path>` | Output path (default `./AGENTS.md`) |
| `--force` | Overwrite even if the file was not generated by Mindr |

---

## mindr generate claude-md

Generate `CLAUDE.md` (Claude Code variant of AGENTS.md).

```bash
mindr generate claude-md [-o <path>] [--force]
```

---

## mindr generate --all

Generate both `AGENTS.md` and `CLAUDE.md` in one step.

```bash
mindr generate --all [--force]
```

---

## mindr serve

Start the MCP server on stdio transport. Used as the command in agent MCP configurations.

```bash
mindr serve
```

All diagnostic output goes to stderr. stdout is the MCP protocol channel.

---

## mindr ui

Start the local Mindr dashboard at `http://127.0.0.1:3131`.

```bash
mindr ui [--port <n>]
```

Pages: Overview, Memories, Decisions, Conventions, Technical Debt, Sessions. Restricted to localhost.

---

## mindr migrate sqlite-to-remembr

Copy all SQLite memories to the Remembr backend. Requires config to already be set to `backend = "remembr"`.

```bash
mindr migrate sqlite-to-remembr [--dry-run]
```

`--dry-run` prints the count of memories that would be migrated without writing anything.
