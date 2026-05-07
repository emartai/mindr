# Conventions

Mindr detects naming and file conventions by analysing your source code with Tree-sitter ASTs. Convention profiles are stored as memories and injected into agent context so agents write code that matches your codebase style automatically.

## What is detected

For each supported language, Mindr analyses:

| Category | Examples |
| --- | --- |
| **Function names** | `camelCase`, `snake_case`, `PascalCase` |
| **Variable names** | `camelCase`, `snake_case`, `SCREAMING_SNAKE_CASE` |
| **Class names** | `PascalCase`, `camelCase` |
| **File names** | `kebab-case`, `snake_case`, `camelCase`, `PascalCase` |
| **Test file patterns** | `.test.ts`, `_test.go`, `test_*.py`, `.spec.ts` |
| **Import grouping** | Grouped (stdlib / external / local) vs. mixed |
| **Error handling** | Typed catch vs. generic `catch(e)`, specific vs. bare `except` |

Each pattern gets a consistency score from 0–100%, based on how many observed samples match it.

## Supported languages

- TypeScript
- JavaScript
- Python
- Go
- Rust

Support for additional languages can be added by contributing a Tree-sitter grammar entry to `packages/core/src/conventions/languages.ts`.

## When conventions are updated

- **On `mindragent init`** — an initial scan runs across all files in the project
- **On every commit** — files touched in the commit are re-scanned incrementally; the stored convention memory for that language is updated

## Viewing conventions

```bash
# Via CLI (shown in mindragent status and mindragent generate agents-md)
mindragent generate agents-md
```

```ts
const profiles = await mindr.getConventions({ language: 'typescript' });
for (const p of profiles) {
  for (const c of p.conventions) {
    console.log(`${c.category}: ${c.pattern} (${c.score}%)`);
  }
}
```

Sample output:

```text
functionNames: camelCase (97%)
classNames: PascalCase (100%)
fileNames: kebab-case (89%)
testPattern: .test.ts (100%)
importGrouping: grouped (72%)
errorHandling: typedCatch (85%)
```

## How consistency score is computed

Mindr counts the number of sampled identifiers that match each pattern style. The score is:

```text
score = (matching_samples / total_samples) × 100
```

A score of 60% for `camelCase functions` means 60% of observed function names use camelCase. The convention is real but not enforced — Mindr reports what it observes, not what it mandates.

## In session context

Convention profiles appear in the `Conventions` section of `mindr:get_context`, showing the top 3 conventions per language by consistency score:

```text
## Conventions (typescript)
- camelCase functions: 97%
- PascalCase classes: 100%
- kebab-case files: 89%
```

Agents use this to write new code that matches the existing style without needing to inspect the codebase manually.

## ConventionProfile type

```ts
interface ConventionProfile {
  language: string
  analyzedFiles: number
  analyzedAt: string          // ISO timestamp
  conventions: ConventionEntry[]
}

interface ConventionEntry {
  pattern: string             // e.g. "camelCase"
  category: string            // e.g. "functionNames"
  score: number               // 0–100
  sampleCount: number         // number of observed samples
}
```
