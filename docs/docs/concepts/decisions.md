# Decisions

Decision memories capture architectural choices, technology migrations, and significant code restructurings. They are the core of what Mindr teaches agents about your codebase.

## How decisions are detected

Every commit processed by the post-commit hook is scored against five trigger signals. If the combined confidence score is ≥ 0.15, a `decision` memory is stored.

### Trigger signals

| Signal | Weight | Condition |
| --- | --- | --- |
| `keyword` | 0.40 | Commit message contains a decision keyword |
| `cross-module-diff` | 0.25 | > 100 lines changed across ≥ 2 module directories |
| `new-directory` | 0.30 | A new top-level `src/*` directory appears |
| `dep-change` | 0.15 | `package.json`, `Cargo.toml`, `go.mod`, or `pyproject.toml` changes |
| `import-pattern-change` | 0.25 | ≥ 5 files add the same new import |

**Decision keywords** (any match in the commit message subject line):

```text
refactor, switch, migrate, chose, decided, architecture, replace,
rewrite, adopt, move to, shift, transition, upgrade, downgrade,
extract, consolidate, standardise, standardize
```

### Confidence score

Confidence is the sum of triggered signal weights, clamped to `[0, 1]`. A commit that changes a `package.json`, touches files across two directories, and has the word "migrate" in the message would score `0.15 + 0.25 + 0.40 = 0.80`.

Stored decisions expose the full trigger list and confidence score in their metadata.

## Manual decisions

Store a decision without a commit:

```bash
mindragent remember "Chose PostgreSQL over MongoDB for ACID guarantees" --type decision --module db
```

Or via the SDK:

```ts
await mindr.remember('Chose PostgreSQL over MongoDB', {
  type: 'decision',
  module: 'db',
  metadata: { date: '2026-05-01' },
});
```

Manual memories have `role: 'user'` and receive a 20-point quality bonus from the manual-capture component.

## Reversing decisions

When an approach is superseded, mark the original decision as reversed:

```bash
mindragent decisions reverse <id>
```

This stores a reversal marker memory. Reversed decisions still appear in `decisions list` (struck through) but are excluded from context injection. The `reversed: true` field is set on the `Decision` object returned by the SDK.

## Querying decisions

```bash
# CLI
mindragent decisions --module api --from 2026-01-01
mindragent replay --show-reversed   # chronological, with reversals visible
```

```ts
// SDK
const decisions = await mindr.getDecisions({
  module: 'api',
  from: new Date('2026-01-01'),
});
```

## In session context

The top 5 recent decisions (by quality score) appear in `mindr:get_context` output:

```text
## Recent Decisions
- [2026-05-01] [api] Switch internal APIs from REST to tRPC
- [2026-04-15] [auth] JWT + Redis refresh tokens for access control
- [2026-04-01] [db] Chose PostgreSQL over MongoDB for ACID guarantees
```

Agents use this to avoid re-litigating past choices and to write code consistent with the architecture.

## Decision lifecycle

```text
Commit pushed
    │
    ▼
post-commit hook
    │
    ▼
watcher scores 5 signals
    │
confidence ≥ 0.15?
    │ yes
    ▼
store decision memory
    │
    ▼ (later, if superseded)
mindragent decisions reverse <id>
    │
    ▼
reversal marker stored
decision excluded from context
```
