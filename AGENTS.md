<!-- mindr-generated -->

# mindr

**Repository:** https://github.com/emartai/mindr  
**Version:** 0.0.1  
**Language:** typescript

## Commands

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Test | `pnpm test` |
| Lint | `pnpm lint` |
| Format | `pnpm format` |

## Stack & Architecture

**Language**
- TypeScript — language

**Framework**
- React — UI library

**Database**
- SQLite — embedded database

**Testing**
- Vitest — test runner

**Tooling**
- tsup — TypeScript bundler
- Turborepo — monorepo build system

## Conventions

### Javascript

| Category | Style | Confidence | Samples |
|----------|-------|-----------|---------|
| Function names | `camelCase` | 83% | 6 |
| File names | `lowercase` | 80% | 5 |
| Variable names | `camelCase` | 71% | 21 |
### Python

| Category | Style | Confidence | Samples |
|----------|-------|-----------|---------|
| Test file pattern | `tests/` | 100% | 2 |
| Function names | `snake_case` | 79% | 14 |
### Typescript

| Category | Style | Confidence | Samples |
|----------|-------|-----------|---------|
| Class / type names | `PascalCase` | 100% | 11 |
| Test file pattern | `tests/` | 100% | 38 |
| errorHandling | `untyped-catch` | 100% | 41 |
| File names | `lowercase` | 85% | 95 |
| Function names | `camelCase` | 83% | 342 |

## Recent Decisions

- **2026-07-15** — fix(debt): don't flag TODO/FIXME quoted in generated instruction files *(dependency-change)*
- **2026-07-15** — feat(generate): per-package monorepo commands + subdir language detection *(dependency-change)*
- **2026-07-15** — docs(generate): document root-only command-detection architecture + monorepo TODO *(keyword)*

## Active Warnings

### Technical Debt

_No active debt items._
