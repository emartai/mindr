# Mindr

**Persistent codebase memory for AI coding agents**

AI coding agents are stateless by default — every session starts from zero, re-learning the same codebase, repeating the same mistakes. Mindr fixes this. It gives every agent — Claude Code, Codex, OpenCode, Cursor, Aider — a persistent, structured memory of your codebase that compounds over time.

[![CI](https://github.com/emartai/mindr/actions/workflows/ci.yml/badge.svg)](https://github.com/emartai/mindr/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mindragent)](https://www.npmjs.com/package/mindragent)
[![npm version](https://img.shields.io/npm/v/@emartai/mindr)](https://www.npmjs.com/package/@emartai/mindr)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Note on naming.** Mindr is the product name. The CLI binary on npm is `mindr` (the name `mindr` was already taken). The npm SDK package is still `@emartai/mindr`. MCP tool names like `mindr:get_context` are protocol identifiers and remain unchanged.
[![Node](https://img.shields.io/node/v/mindragent)](https://www.npmjs.com/package/mindragent)

---

## 60-Second Demo

```bash
# Install
npm install -g mindragent

# Set up Mindr in your repo
cd my-project
mindr init

# Generate AGENTS.md from observed patterns
mindr generate agents-md
```

Sample output:

```markdown
# AGENTS.md

## Project Overview
- Stack: TypeScript, Express, PostgreSQL
- Pattern: tRPC internally, REST externally

## Conventions
- camelCase functions: 97%
- PascalCase classes: 100%
- kebab-case files: 89%

## Recent Decisions
- Apr 17: Switched to tRPC for internal APIs [api-layer]
- Mar 30: JWT + Redis refresh tokens [auth]
- Mar 15: Paystack only, Flutterwave deferred [payments]

## Technical Debt
- src/billing/invoice.ts:47 — Temporary retry logic (43 days)
- src/auth/session.ts:112 — Race condition under high load (12 days)
```

---

## Install

```bash
npm install -g mindragent
```

---

## Agent Setup

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "mindr": { "command": "mindr", "args": ["serve"] }
  }
}
```

### Codex CLI

Add to `codex.toml`:

```toml
[[mcp_servers]]
name    = "mindr"
command = "mindr serve"
```

---

## TypeScript SDK

```bash
npm install @emartai/mindr
```

```ts
import { Mindr } from '@emartai/mindr';

const mindr = await Mindr.open({ project: './my-project' });

await mindr.remember('We use tRPC for all internal APIs', { type: 'decision', module: 'api' });
const context = await mindr.getSessionContext({ module: 'auth' });
const decisions = await mindr.query({ type: 'decision', module: 'auth' });
const debt = await mindr.getDebt();
const conventions = await mindr.getConventions();

mindr.close();
```

---

## Links

- [Documentation](https://mindr.dev)
- [GitHub](https://github.com/emartai/mindr)
- [GitHub Sponsors](https://github.com/sponsors/emartai)
- [Discord](https://discord.gg/mindr)

---

## License

[MIT](LICENSE) © 2026 emartai
