# CLI Reference

Install the CLI globally:

```bash
npm install -g mindragent
```

The binary is `mindragent`. All commands discover the project root by walking up from `cwd` to find `.mindr/config.toml`.

---

## mindragent init

Initialize Mindr in the current git repository.

```bash
mindragent init
```

Interactive prompts select a storage backend (SQLite or Remembr). Creates `.mindr/config.toml`, installs the post-commit hook, and runs an initial convention scan.

**Requirements:** must be inside a git repository.

---

## mindragent remember

Store a manual memory.

```bash
mindragent remember "<content>" [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--type <type>` | Memory type: `decision`, `convention`, `bug_pattern`, `debt`, `note`, `context` |
| `--module <name>` | Module or area this memory belongs to (e.g. `auth`, `api`) |
| `--tag <k:v>` | Extra tag as `key:value` (repeatable) |

**Examples:**

```bash
mindragent remember "Switched from REST to tRPC for internal APIs" --type decision --module api
mindragent remember "JWT access tokens expire in 15 minutes" --type note --module auth
mindragent remember "billing retry loop is temporary" --type debt --module billing --tag severity:high
```

---

## mindragent forget

Soft-delete a memory by ID.

```bash
mindragent forget <id>
```

The memory is marked deleted and excluded from all future queries. Pass the full ID or a prefix — any unique prefix is accepted.

---

## mindragent memory list

List stored memories in a table.

```bash
mindragent memory list [options]
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
mindragent memory list --type decision --module api --since 2026-01-01
```

---

## mindragent memory inspect

Print full JSON for a single memory, including quality breakdown.

```bash
mindragent memory inspect <id>
```

---

## mindragent decisions

List decision memories in a table with confidence scores and triggers.

```bash
mindragent decisions [options]
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

## mindragent decisions reverse

Mark a decision as reversed (superseded by a later decision). The decision remains visible but is struck through in `decisions list` output.

```bash
mindragent decisions reverse <id>
```

---

## mindragent replay

Show decisions in chronological order (oldest first). Useful for reviewing how the codebase evolved.

```bash
mindragent replay [options]
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

## mindragent branch status

Show memory activity scoped to the current git branch: branch-specific memories, reachable memories from the last 90 days, and shared memories from the default branch.

```bash
mindragent branch status [--json]
```

---

## mindragent bugs list

List stored bug-pattern memories (fingerprints of pre-fix function shapes).

```bash
mindragent bugs list [--module <name>] [--json]
```

---

## mindragent debt list

List active technical debt items.

```bash
mindragent debt list [options]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--severity <level>` | Filter by `high`, `medium`, or `low` |
| `--module <name>` | Filter by module |
| `--age <days>` | Only show items older than N days |
| `--json` | Output raw JSON array |

---

## mindragent debt add

Manually record a technical debt item.

```bash
mindragent debt add "<text>" --file <path> [--severity <level>]
```

**Options:**

| Flag | Description |
| --- | --- |
| `--file <path>` | Source file path (required) |
| `--severity <level>` | `high`, `medium`, or `low` (default `medium`) |

**Example:**

```bash
mindragent debt add "Temporary retry loop — replace with queue" --file src/billing/invoice.ts --severity high
```

---

## mindragent debt resolve

Mark a debt item as resolved.

```bash
mindragent debt resolve <id>
```

Stores a `debt_resolved` marker. The original debt memory is preserved for audit purposes.

---

## mindragent debt report

Print a markdown table summarising debt by module and severity.

```bash
mindragent debt report
```

---

## mindragent session health

Score context health for a session (0–100). A score below 40 means the session has drifted; consider starting fresh.

```bash
mindragent session health <session-id>
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

## mindragent session checkpoint

Write a checkpoint memory for a session. Useful before switching context.

```bash
mindragent session checkpoint <session-id>
```

---

## mindragent stats

Show token metering and estimated savings.

```bash
mindragent stats [--session <id>] [--last <window>]
```

`--last` accepts `30m`, `2h`, `7d`, `2w` (minutes, hours, days, weeks).

---

## mindragent status

Show Mindr status: backend type, git hook status, last processed commit, and per-type memory counts.

```bash
mindragent status [--json]
```

---

## mindragent config get

Read a config value by dotted key.

```bash
mindragent config get <key>
```

**Examples:**

```bash
mindragent config get storage.backend
mindragent config get remembr.base_url
```

---

## mindragent config set

Write a config value by dotted key.

```bash
mindragent config set <key> <value>
```

**Examples:**

```bash
mindragent config set storage.backend remembr
mindragent config set remembr.base_url https://api.remembr.io
```

---

## mindragent generate agents-md

Generate `AGENTS.md` from observed patterns and stored memories.

```bash
mindragent generate agents-md [-o <path>] [--force]
```

**Options:**

| Flag | Description |
| --- | --- |
| `-o, --output <path>` | Output path (default `./AGENTS.md`) |
| `--force` | Overwrite even if the file was not generated by Mindr |

---

## mindragent generate claude-md

Generate `CLAUDE.md` (Claude Code variant of AGENTS.md).

```bash
mindragent generate claude-md [-o <path>] [--force]
```

---

## mindragent generate --all

Generate both `AGENTS.md` and `CLAUDE.md` in one step.

```bash
mindragent generate --all [--force]
```

---

## mindragent serve

Start the MCP server on stdio transport. Used as the command in agent MCP configurations.

```bash
mindragent serve
```

All diagnostic output goes to stderr. stdout is the MCP protocol channel.

---

## mindragent ui

Start the local Mindr dashboard at `http://127.0.0.1:3131`.

```bash
mindragent ui [--port <n>]
```

Pages: Overview, Memories, Decisions, Conventions, Technical Debt, Sessions. Restricted to localhost.

---

## mindragent migrate sqlite-to-remembr

Copy all SQLite memories to the Remembr backend. Requires config to already be set to `backend = "remembr"`.

```bash
mindragent migrate sqlite-to-remembr [--dry-run]
```

`--dry-run` prints the count of memories that would be migrated without writing anything.
