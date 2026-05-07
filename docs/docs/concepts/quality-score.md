# Quality Score

Every memory has a quality score from 0–100. Mindr uses this score to rank memories for context injection, surface the most relevant decisions first, and sort `memory list` output.

The score is entirely deterministic — no ML, no embeddings, no external calls.

## Components

| Component | Max points | Condition |
| --- | --- | --- |
| Recency | 40 | Decays linearly over 30 days from creation |
| Commit association | 25 | Memory has a `git_commit` tag |
| Manual capture | 20 | Memory was created with `role: 'user'` (i.e. `mindragent remember`) |
| Retrieval frequency | 10 | `metadata.retrieveCount` increments each time the memory is served in context |
| Contradiction penalty | −25 | Memory is tagged as a reversed decision |

**Recency formula:**

```text
recencyScore = max(0, 40 × (1 − daysSinceCreation / 30))
```

A memory created today scores 40. A memory created 15 days ago scores 20. A memory older than 30 days scores 0 from this component.

**Total:**

```text
total = clamp(recency + commitAssociation + manualCapture + retrievalFrequency + contradiction, 0, 100)
```

## Why this matters

Context injection is token-limited. When Mindr has more information than fits in the budget, it ranks memories by quality score and drops the lowest-scoring ones first. A high-quality memory is one that is:

- Recent (still relevant)
- Associated with a git commit (grounded in real code change)
- Manually captured (the developer considered it worth storing)
- Frequently retrieved (agents found it useful before)

A reversed decision scores negatively to ensure it is excluded before any active memory.

## Inspecting a score

```bash
mindragent memory inspect <id>
```

Output includes `qualityScore` and the full `qualityBreakdown`:

```json
{
  "id": "mem-abc123",
  "content": "Decision: switch internal APIs to tRPC",
  "qualityScore": 85,
  "qualityBreakdown": {
    "recency": 40,
    "commitAssociation": 25,
    "manualCapture": 0,
    "retrievalFrequency": 10,
    "contradiction": 0,
    "total": 85
  }
}
```

## Sorting by quality

```bash
mindragent memory list --sort quality
```

```ts
const memories = await mindr.query({ type: 'decision' });
// Already sorted by quality descending
memories.forEach(m => console.log(m.qualityScore, m.content));
```
