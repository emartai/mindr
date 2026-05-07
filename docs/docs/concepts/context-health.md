# Context Health

Context health is a 0–100 score that measures how focused the current agent session is. When sessions drift — touching too many modules, too many files, or running too long — agents make more mistakes and context injection becomes less useful. Mindr quantifies this drift so agents can decide when to checkpoint or start fresh.

## Score components

The score starts at 100 and applies penalties for each signal:

| Signal | Max penalty | Trigger |
| --- | --- | --- |
| Modules touched | 24 | More than 2 distinct modules |
| Files touched | 20 | More than 8 distinct files |
| Off-task ratio | 25 | Files touched outside the active task |
| Elapsed time | 15 | More than 90 minutes |
| Topic spread | 16 | Caller-provided dispersion metric |

**Penalty formulas:**

- Modules: `min(24, (moduleCount − 2) × 8)`
- Files: `min(20, (fileCount − 8) × 2)`
- Off-task: `min(25, offTaskRatio × 25)`
- Time: `min(15, Math.floor((minutesElapsed − 90) / 30) × 5)`
- Topic spread: `min(16, topicSpread × 16)` (topicSpread is a 0–1 float supplied by the caller)

## Recommendations

| Score | Recommendation | Meaning |
| --- | --- | --- |
| ≥ 70 | `ok` | Session is focused; continue |
| 40–69 | `consider_checkpoint` | Session is drifting; checkpoint before continuing |
| < 40 | `recommend_fresh_session` | Session has drifted significantly; start fresh |

## Checking health

Via the MCP tool:

```json
{
  "name": "mindr:context_health",
  "arguments": {
    "filesTouched": ["src/auth/login.ts", "src/auth/session.ts", "src/api/users.ts"],
    "modulesTouched": ["auth", "api"],
    "activeTaskFiles": ["src/auth/login.ts", "src/auth/session.ts"],
    "startedAt": "2026-05-07T10:00:00Z",
    "topicSpread": 0.2
  }
}
```

Response:

```json
{
  "score": 78,
  "recommendation": "ok",
  "breakdown": {
    "modules": 0,
    "files": 0,
    "offTask": 7,
    "time": 0,
    "topicSpread": 3
  }
}
```

Via CLI:

```bash
mindragent session health <session-id>
```

Via SDK:

```ts
const health = await mindr.getContextHealth('session-abc');
console.log(health.score, health.recommendation);
```

## Writing a checkpoint

Before switching context or starting a long tangent, write a checkpoint:

```bash
mindragent session checkpoint <session-id>
```

```ts
await mindr.checkpointSession('session-abc');
```

This stores a `session_checkpoint` memory that can be retrieved in a later session to resume where you left off:

```bash
mindragent memory list --type session_checkpoint
```

## Topic spread

Topic spread is a 0–1 float the caller supplies to represent how dispersed the session's work is across unrelated topics. It is agent-supplied and not computed by Mindr. Agents that track their own task list can compute this as:

```text
topicSpread = (distinct topics - 1) / maxTopics
```

If you do not track topics, omit `topicSpread` and Mindr defaults to 0 (no penalty).
