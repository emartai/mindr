# Bug Patterns

Mindr stores structural fingerprints of known bugs so agents are warned when the same mistake is about to be repeated.

## How fingerprinting works

When Mindr sees a commit with a `fix:` prefix (or `fix(scope):` in Conventional Commits format), it:

1. Retrieves the pre-fix version of changed files from git
2. Parses each function body with Tree-sitter
3. Computes a **structural hash** of each function: the hash captures control flow shape (if/else nesting, try/catch, loops, return positions) while ignoring variable names, string literals, and numeric constants
4. Stores the pre-fix hashes as `bug_pattern` memories

When new code is submitted for checking, Mindr fingerprints it the same way and looks for matches against stored patterns.

## What the structural hash captures

The hash is derived from the AST node types traversed in a depth-first walk, not from the text content. Two functions with the same structure but different variable names produce the same hash. For example:

```ts
// Function A
function processUser(user) {
  if (user.active) {
    return doSomething(user.id)
  }
  return null
}

// Function B (same structure, different names)
function handleItem(item) {
  if (item.enabled) {
    return process(item.key)
  }
  return null
}
```

These produce the same structural fingerprint, because the shape (if-return-return) is identical.

## Supported languages

- TypeScript
- JavaScript
- Python

## Viewing stored patterns

```bash
mindragent bugs list
mindragent bugs list --module auth
```

## Checking code against patterns

Via the MCP tool (agents use this automatically):

```json
{
  "name": "mindr:check_for_bug_patterns",
  "arguments": {
    "code": "function processPayment(order) { ... }",
    "language": "typescript"
  }
}
```

Response when a match is found:

```json
{
  "warning": true,
  "confidence": 0.67,
  "hits": 2,
  "totalFingerprints": 3,
  "matches": [
    {
      "id": "mem-abc123",
      "fingerprint": "a1b2c3...",
      "module": "billing",
      "fixCommit": "deadbeef",
      "content": "Bug pattern from fix: handle null payment method"
    }
  ]
}
```

`confidence` is `hits / totalFingerprints` — the fraction of function fingerprints in the submitted code that match stored patterns.

## Match confidence levels

| Confidence | Meaning |
| --- | --- |
| 0 | No matches |
| 0–0.3 | Partial match — one or two functions resemble a known bug |
| 0.3–0.7 | Moderate match — several functions match; worth reviewing |
| > 0.7 | Strong match — most functions closely resemble a known bug shape |

Mindr never blocks — all matches are warnings. The agent reviews the match and decides whether the code is actually buggy.

## Limitations

- Fingerprinting is structural, not semantic. Two completely different bugs with similar `if/else` shapes will share a fingerprint.
- Small functions (single expression) produce low-entropy hashes that match frequently. Mindr reports `totalFingerprints` so agents can calibrate confidence accordingly.
- Support for Go and Rust fingerprinting is planned but not yet implemented.
