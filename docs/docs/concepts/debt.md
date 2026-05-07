# Technical Debt

Mindr tracks technical debt automatically from git diffs and allows manual debt entry. Debt items surface in CLI output, SDK queries, and agent context warnings.

## Automatic detection

On every commit, the post-commit hook scans added lines in the diff for debt markers:

| Keyword | Default severity |
| --- | --- |
| `HACK` | high |
| `FIXME` | high |
| `XXX` | high |
| `TODO` | medium |
| `TECH-DEBT` | medium |

Severity is promoted to `high` if the marker text also contains words like `urgent`, `asap`, or `prod`.

Each detected marker is stored as a `debt` memory with:

- `content` — the full marker line text
- `metadata.file` — source file path
- `metadata.line` — line number
- `metadata.keyword` — the matched keyword
- `metadata.severity` — inferred severity
- A stable `debt_id` tag — deterministic hash of `file + keyword + text`, so re-processing the same commit does not create duplicates

## Manual debt entry

Add debt items without a commit:

```bash
mindr debt add "Replace temporary retry loop with proper queue" \
  --file src/billing/invoice.ts \
  --severity high
```

```ts
await mindr.addDebt('Replace temporary retry loop', {
  file: 'src/billing/invoice.ts',
  severity: 'high',
  module: 'billing',
});
```

## Resolving debt

When a debt item is addressed, mark it resolved:

```bash
mindr debt resolve <debt-id>
```

This stores a `debt_resolved` marker that references the original debt ID. The original memory is preserved for audit purposes — it is not deleted.

```ts
await mindr.resolveDebt('mem-abc123');
```

## Listing and reporting

```bash
# Show all debt
mindr debt list

# Filter by severity and module
mindr debt list --severity high --module billing

# Show only old debt (older than 30 days)
mindr debt list --age 30

# Markdown summary by module and severity
mindr debt report
```

```ts
const debt = await mindr.getDebt({
  severity: 'high',
  module: 'billing',
});
```

## In session context

High-severity debt items appear in the `Warnings` section of `mindr:get_context`:

```text
## Warnings
⚠ FIXME src/billing/invoice.ts:47 — retry logic (high, 43d)
⚠ HACK src/auth/session.ts:112 — race condition under load (high, 12d)
```

Agents see these warnings and can decide whether to address the debt during their current session.

## Debt lifecycle

```text
git commit
    │
    ▼
diff scanned for markers
    │
    ▼
debt memory stored (stable debt_id)
    │
    ▼ (when addressed)
mindr debt resolve <id>
    │
    ▼
debt_resolved marker stored
debt excluded from warnings
```
