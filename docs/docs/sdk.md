# SDK Reference

```bash
npm install @emartai/mindr
```

The SDK provides a typed TypeScript API for programmatic access to Mindr. It wraps `@emartai/mindr-core` without depending on the CLI.

```ts
import { Mindr } from '@emartai/mindr';

const mindr = await Mindr.open({ project: './my-project' });
// ... use the API ...
mindr.close();
```

---

## Mindr.open(opts)

Open a Mindr client for a project. Loads `.mindr/config.toml` from `opts.project` (walking up the directory tree), connects to the configured backend, and returns a ready client.

```ts
const mindr = await Mindr.open({ project: './my-project' });
```

**Options (`MindrOpenOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `project` | `string` | Absolute or relative path to the project root |
| `backend?` | `MemoryBackend` | Inject a pre-built backend (skips config loading — useful for testing) |
| `config?` | `MindrConfig` | Inject a pre-built config (skips `.mindr/config.toml` discovery) |

---

## mindr.close()

Release resources held by the backend (e.g. SQLite file handles). Call this when done.

```ts
mindr.close();
```

---

## mindr.remember(content, opts?)

Store a memory string.

```ts
const mem = await mindr.remember('We use tRPC for all internal APIs', {
  type: 'decision',
  module: 'api',
});
console.log(mem.id); // "mem-abc123..."
```

**Options (`RememberOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `type?` | `MemoryType` | `decision`, `convention`, `bug_pattern`, `debt`, `note`, `context` |
| `module?` | `string` | Module or area (e.g. `'api'`, `'auth'`) |
| `tags?` | `MindrTag[]` | Additional `{ key, value }` tags |
| `metadata?` | `Record<string, unknown>` | Arbitrary metadata stored with the memory |

Returns a `MindrMemory`.

---

## mindr.forget(id)

Soft-delete a memory by ID.

```ts
await mindr.forget(mem.id);
```

---

## mindr.query(opts?)

List raw memories matching filters, enriched with quality scores.

```ts
const results = await mindr.query({
  type: 'decision',
  module: 'api',
  since: new Date('2026-01-01'),
  limit: 10,
});

for (const m of results) {
  console.log(m.content, m.qualityScore);
}
```

**Options (`QueryOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `type?` | `MemoryType` | Filter by memory type |
| `module?` | `string` | Filter by module tag |
| `since?` | `Date` | Only return memories created at or after this date |
| `limit?` | `number` | Max results (default 50) |

Returns `ScoredMemory[]` — `MindrMemory` extended with `qualityScore: number` and `qualityBreakdown: QualityBreakdown`.

---

## mindr.getDecisions(opts?)

Return decision memories as structured `Decision` objects, newest first.

```ts
const decisions = await mindr.getDecisions({ module: 'api' });

for (const d of decisions) {
  console.log(`[${d.date}] ${d.summary} (confidence: ${d.confidence})`);
}
```

**Options (`DecisionsOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `module?` | `string` | Filter by module |
| `from?` | `Date` | On or after this date |
| `to?` | `Date` | On or before this date |
| `limit?` | `number` | Max results (default 50) |

**`Decision` fields:**

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Memory ID |
| `summary` | `string` | Decision text (prefix `"Decision: "` stripped) |
| `date` | `string` | `YYYY-MM-DD` date string |
| `module` | `string` | Module tag value |
| `trigger?` | `string` | Primary trigger type |
| `triggers?` | `string[]` | All trigger types that fired |
| `confidence?` | `number` | Confidence score in `[0, 1]` |
| `rationale?` | `string` | Commit body text |
| `filesAffected?` | `string[]` | Files touched in the triggering commit |
| `reversed?` | `boolean` | True if this decision was later reversed |
| `createdAt` | `string` | Full ISO 8601 timestamp |

---

## mindr.getDebt(opts?)

Return active debt items (TODO / FIXME / HACK) as structured `DebtItem` objects.

```ts
const debt = await mindr.getDebt({ severity: 'high' });

for (const item of debt) {
  console.log(`${item.keyword} ${item.location}: ${item.content}`);
}
```

**Options (`DebtOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `module?` | `string` | Filter by module |
| `severity?` | `'high' \| 'medium' \| 'low'` | Filter by severity |
| `minAge?` | `number` | Only return items older than N days |
| `limit?` | `number` | Max results |

**`DebtItem` fields:**

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Memory ID |
| `content` | `string` | Raw debt text |
| `location` | `string` | `file:line` string |
| `keyword` | `string` | `TODO`, `FIXME`, `HACK`, or `XXX` |
| `file?` | `string` | Source file path |
| `line?` | `number` | Line number |
| `module` | `string` | Module tag |
| `severity?` | `string` | `high`, `medium`, or `low` |
| `createdAt` | `string` | Full ISO 8601 timestamp |

---

## mindr.addDebt(content, opts)

Manually record a technical debt item.

```ts
const item = await mindr.addDebt('Temporary retry loop — replace with queue', {
  file: 'src/billing/invoice.ts',
  severity: 'high',
});
```

**Options (`AddDebtOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `file` | `string` | Source file path (required) |
| `severity?` | `'high' \| 'medium' \| 'low'` | Default `'medium'` |
| `module?` | `string` | Overrides the module inferred from `file` |
| `tags?` | `MindrTag[]` | Additional tags |
| `metadata?` | `Record<string, unknown>` | Additional metadata |

Returns a `DebtItem`.

---

## mindr.resolveDebt(id)

Mark a debt item as resolved. Stores a `debt_resolved` marker; the original item is preserved.

```ts
await mindr.resolveDebt('mem-abc123');
```

---

## mindr.getConventions(opts?)

Return detected convention profiles per language.

```ts
const profiles = await mindr.getConventions({ language: 'typescript' });

for (const p of profiles) {
  for (const c of p.conventions) {
    console.log(`${p.language} ${c.category}: ${c.pattern} (${c.score}%)`);
  }
}
```

**Options (`ConventionsOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `language?` | `string` | Filter by language (e.g. `'typescript'`, `'python'`) |

Returns `ConventionProfile[]`. Each profile has:

| Field | Type | Description |
| --- | --- | --- |
| `language` | `string` | Language name |
| `analyzedFiles` | `number` | Number of files scanned |
| `analyzedAt` | `string` | ISO timestamp of last scan |
| `conventions` | `ConventionEntry[]` | Detected patterns with scores |

Each `ConventionEntry` has `pattern`, `category`, `score` (0–100), and `sampleCount`.

---

## mindr.getSessionContext(opts?)

Build a token-aware session context block for injecting into an agent's system prompt.

```ts
const ctx = await mindr.getSessionContext({
  module: 'auth',
  max_tokens: 2000,
});

console.log(ctx.summary); // === MINDR CONTEXT === ...
```

**Options (`SessionContextOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `module?` | `string` | Focus context on a specific module |
| `files?` | `string[]` | Changed files for scoped context |
| `max_tokens?` | `number` | Token budget; Mindr trims sections to fit |

Returns a `SessionContext` with:

- `summary` — the full formatted context string
- `stack` — detected languages and frameworks
- `conventions` — convention profiles
- `decisions` — recent decision memories
- `hotModules` — most-touched modules
- `warnings` — high-severity debt items
- `tokensUsed` — estimated token count
- `droppedSections` — sections omitted due to token budget

---

## mindr.getContextHealth(sessionId)

Score how focused the current session is (0–100).

```ts
const health = await mindr.getContextHealth('session-abc');
// { score: 72, recommendation: 'ok', breakdown: { ... } }
```

Recommendations: `'ok'` (≥70), `'consider_checkpoint'` (40–69), `'recommend_fresh_session'` (below 40).

---

## mindr.checkpointSession(sessionId)

Write a session checkpoint memory.

```ts
const checkpoint = await mindr.checkpointSession('session-abc');
```

---

## mindr.getStats(opts?)

Return token metering totals.

```ts
const stats = await mindr.getStats({ last: '7d' });
// { sessions: 12, tokensInjected: 48000, estimatedSaved: 96000, range: { low: 48000, high: 96000 } }
```

**Options:**

| Field | Type | Description |
| --- | --- | --- |
| `session?` | `string` | Filter to a specific session ID |
| `last?` | `string` | Time window: `'30m'`, `'2h'`, `'7d'`, `'2w'` |

---

## mindr.getStatus()

Return a snapshot of the instance — backend type, project path, and per-type memory counts.

```ts
const status = await mindr.getStatus();
// { backendType: 'sqlite', projectPath: '/my-project', memoryCounts: { decision: 12, debt: 5, ... } }
```

---

## mindr.regenerateAgentsMd(opts?)

Generate `AGENTS.md` and/or `CLAUDE.md` from observed patterns, writing to disk.

```ts
const { agentsMd } = await mindr.regenerateAgentsMd();
// Wrote AGENTS.md to project root

const { agentsMd, claudeMd } = await mindr.regenerateAgentsMd({ target: 'all' });
```

**Options (`RegenerateOptions`):**

| Field | Type | Description |
| --- | --- | --- |
| `target?` | `'agents-md' \| 'claude-md' \| 'all'` | Which file(s) to generate (default `'agents-md'`) |
| `agentsMdPath?` | `string` | Custom output path for AGENTS.md |
| `claudeMdPath?` | `string` | Custom output path for CLAUDE.md |

Returns a `RegenerateResult` with `agentsMd?` and `claudeMd?` content strings.

---

## mindr.migrateSqliteToRemembr()

Copy all SQLite memories to the Remembr backend.

```ts
const { migrated } = await mindr.migrateSqliteToRemembr();
console.log(`Migrated ${migrated} memories`);
```

Requires the config to already have `storage.backend = "remembr"` and valid Remembr credentials.

---

## MEMORY_TYPES

Exported constant listing all valid memory type strings.

```ts
import { MEMORY_TYPES } from '@emartai/mindr';
// ['decision', 'convention', 'bug_pattern', 'debt', 'debt_resolved', 'session_checkpoint', 'note', 'context']
```

---

## Full example

```ts
import { Mindr } from '@emartai/mindr';

const mindr = await Mindr.open({ project: '.' });

// Store decisions
await mindr.remember('Chose PostgreSQL over MongoDB for ACID guarantees', {
  type: 'decision',
  module: 'db',
});

// Query context for auth module
const ctx = await mindr.getSessionContext({ module: 'auth', max_tokens: 1500 });

// List high-severity debt
const debt = await mindr.getDebt({ severity: 'high' });
console.log(`${debt.length} high-severity debt items`);

// Check token savings
const stats = await mindr.getStats({ last: '7d' });
console.log(`Saved ~${stats.estimatedSaved} tokens this week`);

// Generate fresh AGENTS.md
await mindr.regenerateAgentsMd();

mindr.close();
```
