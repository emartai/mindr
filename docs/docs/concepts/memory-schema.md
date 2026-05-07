# Memory Schema

Every piece of information Mindr stores is a `MindrMemory`. Understanding the schema lets you write precise queries and custom integrations.

## MindrMemory

```ts
interface MindrMemory {
  id: string                        // stable UUID
  content: string                   // the text of the memory
  role: 'user' | 'system'          // 'user' = manual; 'system' = auto-detected
  sessionId?: string                // agent session that created this memory
  tags: MindrTag[]                  // key/value labels for filtering
  metadata?: Record<string, unknown> // structured data beyond text
  createdAt: string                 // ISO 8601 timestamp
  deletedAt?: string                // set on soft-delete; excluded from queries
}

interface MindrTag {
  key: string
  value: string
}
```

## Memory types

The `type` tag is the primary classifier. Every memory has exactly one type tag (except `metering` records which are internal).

| Type | Who creates it | Purpose |
| --- | --- | --- |
| `decision` | Post-commit hook, `mindr remember` | Architectural or significant code choices |
| `convention` | Post-commit hook, `mindr init` | Naming and file conventions per language |
| `bug_pattern` | Post-commit hook (fix commits) | Structural fingerprint of a known bug shape |
| `debt` | Post-commit hook, `mindr debt add` | TODO / FIXME / HACK markers with location |
| `debt_resolved` | `mindr debt resolve` | Marker that a debt item was addressed |
| `session_checkpoint` | `mindr session checkpoint` | Session summary written before context switch |
| `note` | `mindr remember` | Free-form manual notes |
| `context` | Post-commit hook | Activity record for session metering |

## Common tags

Tags are stored as `{ key, value }` objects in the SDK and as `mindr:<key>:<value>` strings on the wire (in the Remembr backend). `packages/core/src/schema.ts` is the conversion boundary.

| Key | Values | Used on |
| --- | --- | --- |
| `type` | See table above | All memories |
| `module` | Directory name (e.g. `auth`, `api`) | Most memories |
| `language` | `typescript`, `python`, `go`, `rust`, `javascript` | `convention` |
| `fingerprint` | SHA-256 hex string | `bug_pattern` |
| `fix_commit` | Git SHA | `bug_pattern` |
| `severity` | `high`, `medium`, `low` | `debt` |
| `debt_id` | Stable hash of file+keyword+text | `debt` |
| `git_commit` | Git SHA | `decision`, `context` |
| `branch_lineage` | Branch name | `decision`, `context` |
| `reversed_decision` | `true` | `note` (reversal markers) |
| `original_decision` | Memory ID | `note` (reversal markers) |
| `original_debt` | Memory ID | `debt_resolved` |
| `source` | `manual` | Manually-added debt and memories |

## Decision metadata

Decision memories carry structured metadata beyond the tag set:

```ts
{
  date: "2026-05-01",              // YYYY-MM-DD
  trigger: "keyword",              // primary trigger type
  triggers: ["keyword", "dep-change"], // all triggered signals
  confidence: 0.55,                // sum of signal weights [0, 1]
  rationale: "...",                // commit body text
  filesAffected: ["package.json", "src/api/index.ts"]
}
```

## Debt metadata

```ts
{
  file: "src/billing/invoice.ts",
  line: 47,
  keyword: "FIXME",
  severity: "high",
  manual: true   // only present for manually-added items
}
```

## Convention metadata

Convention memories store a full `ConventionProfile` in metadata:

```ts
{
  language: "typescript",
  profile: {
    language: "typescript",
    analyzedFiles: 42,
    analyzedAt: "2026-05-01T10:00:00Z",
    conventions: [
      { pattern: "camelCase", category: "functionNames", score: 97, sampleCount: 210 },
      { pattern: "PascalCase", category: "classNames", score: 100, sampleCount: 18 },
      { pattern: "kebab-case", category: "fileNames", score: 89, sampleCount: 45 }
    ]
  }
}
```

## Wire format

When memories are stored in the Remembr backend, tags are serialised as strings in the format `mindr:<key>:<value>`. For example:

```text
mindr:type:decision
mindr:module:api
mindr:git_commit:a1b2c3d4
```

The `MindrTag` ↔ wire format conversion is handled automatically by `packages/core/src/schema.ts`. You never need to construct wire-format strings unless writing a custom backend.
