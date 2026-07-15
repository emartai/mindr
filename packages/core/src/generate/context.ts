// Shared data types and gatherers for all generator targets.

import { readFileSync, existsSync, readdirSync, type Dirent } from 'fs'
import { join, basename } from 'path'
import { parse as parseTOML } from '@iarna/toml'
import { simpleGit } from 'simple-git'
import type { MemoryBackend, MindrMemory } from '../storage/backend.js'
import type { ConventionProfile } from '../conventions/detector.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectMeta {
  name: string
  description: string
  version: string
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'mixed' | 'unknown'
  repoUrl: string | null
}

export type StackCategory = 'language' | 'framework' | 'database' | 'testing' | 'tooling' | 'other'

export interface StackItem {
  name: string
  role: string
  category: StackCategory
}

/** A build/test/run/lint command an agent should use, auto-extracted from the repo. */
export interface CommandItem {
  label: string    // canonical label: Install | Dev | Build | Test | Lint | Typecheck | Format | Run
  command: string  // the exact shell command, e.g. `pnpm test`
}

export interface GenerateContext {
  meta: ProjectMeta
  commands: CommandItem[]            // build/test/run/lint commands, in canonical order
  stack: StackItem[]
  conventions: ConventionProfile[]   // latest per language, sorted by language name asc
  decisions: MindrMemory[]           // top 5 most recent
  debt: MindrMemory[]                // all active debt, sorted by content asc
}

// ---------------------------------------------------------------------------
// Stack knowledge base
// ---------------------------------------------------------------------------

interface KnownDep { name: string; role: string; category: StackCategory }

const KNOWN_DEPS: Record<string, KnownDep> = {
  // Language markers
  typescript:           { name: 'TypeScript',        role: 'language',                  category: 'language'   },
  // Frontend
  react:                { name: 'React',              role: 'UI library',                category: 'framework'  },
  next:                 { name: 'Next.js',            role: 'React framework',           category: 'framework'  },
  vue:                  { name: 'Vue',                role: 'UI framework',              category: 'framework'  },
  nuxt:                 { name: 'Nuxt',               role: 'Vue framework',             category: 'framework'  },
  svelte:               { name: 'Svelte',             role: 'UI framework',              category: 'framework'  },
  '@sveltejs/kit':      { name: 'SvelteKit',          role: 'Svelte framework',          category: 'framework'  },
  astro:                { name: 'Astro',              role: 'web framework',             category: 'framework'  },
  'solid-js':           { name: 'SolidJS',            role: 'UI library',                category: 'framework'  },
  // Backend
  express:              { name: 'Express',            role: 'HTTP server',               category: 'framework'  },
  fastify:              { name: 'Fastify',            role: 'HTTP server',               category: 'framework'  },
  koa:                  { name: 'Koa',                role: 'HTTP server',               category: 'framework'  },
  '@nestjs/core':       { name: 'NestJS',             role: 'backend framework',         category: 'framework'  },
  hono:                 { name: 'Hono',               role: 'HTTP framework',            category: 'framework'  },
  elysia:               { name: 'Elysia',             role: 'HTTP framework',            category: 'framework'  },
  // DB / ORM
  '@prisma/client':     { name: 'Prisma',             role: 'ORM',                       category: 'database'   },
  typeorm:              { name: 'TypeORM',             role: 'ORM',                       category: 'database'   },
  'drizzle-orm':        { name: 'Drizzle',            role: 'ORM',                       category: 'database'   },
  mongoose:             { name: 'Mongoose',           role: 'MongoDB ODM',               category: 'database'   },
  sequelize:            { name: 'Sequelize',          role: 'ORM',                       category: 'database'   },
  'better-sqlite3':     { name: 'SQLite',             role: 'embedded database',         category: 'database'   },
  pg:                   { name: 'PostgreSQL',         role: 'database client',           category: 'database'   },
  mysql2:               { name: 'MySQL',              role: 'database client',           category: 'database'   },
  ioredis:              { name: 'Redis',              role: 'cache / pub-sub',           category: 'database'   },
  // Testing
  vitest:               { name: 'Vitest',             role: 'test runner',               category: 'testing'    },
  jest:                 { name: 'Jest',               role: 'test runner',               category: 'testing'    },
  mocha:                { name: 'Mocha',              role: 'test runner',               category: 'testing'    },
  '@playwright/test':   { name: 'Playwright',         role: 'E2E testing',               category: 'testing'    },
  cypress:              { name: 'Cypress',            role: 'E2E testing',               category: 'testing'    },
  // APIs
  graphql:              { name: 'GraphQL',            role: 'API query language',        category: 'framework'  },
  '@apollo/server':     { name: 'Apollo Server',      role: 'GraphQL server',            category: 'framework'  },
  '@trpc/server':       { name: 'tRPC',               role: 'typesafe RPC',              category: 'framework'  },
  // Validation
  zod:                  { name: 'Zod',                role: 'schema validation',         category: 'tooling'    },
  joi:                  { name: 'Joi',                role: 'schema validation',         category: 'tooling'    },
  // Build / monorepo
  vite:                 { name: 'Vite',               role: 'build tool',                category: 'tooling'    },
  turbo:                { name: 'Turborepo',          role: 'monorepo build system',     category: 'tooling'    },
  nx:                   { name: 'Nx',                 role: 'monorepo build system',     category: 'tooling'    },
  tsup:                 { name: 'tsup',               role: 'TypeScript bundler',        category: 'tooling'    },
  // CSS
  tailwindcss:          { name: 'Tailwind CSS',       role: 'CSS framework',             category: 'tooling'    },
  // Auth
  'next-auth':          { name: 'NextAuth',           role: 'authentication',            category: 'tooling'    },
  '@auth/core':         { name: 'Auth.js',            role: 'authentication',            category: 'tooling'    },
  // Queue
  bullmq:               { name: 'BullMQ',             role: 'job queue',                 category: 'tooling'    },

  // --- Python ---
  fastapi:              { name: 'FastAPI',            role: 'web framework',             category: 'framework'  },
  django:               { name: 'Django',             role: 'web framework',             category: 'framework'  },
  flask:                { name: 'Flask',              role: 'web framework',             category: 'framework'  },
  starlette:            { name: 'Starlette',          role: 'ASGI framework',            category: 'framework'  },
  aiohttp:              { name: 'aiohttp',            role: 'async HTTP framework',      category: 'framework'  },
  uvicorn:              { name: 'Uvicorn',            role: 'ASGI server',               category: 'tooling'    },
  gunicorn:             { name: 'Gunicorn',           role: 'WSGI server',               category: 'tooling'    },
  celery:               { name: 'Celery',             role: 'task queue',                category: 'tooling'    },
  sqlalchemy:           { name: 'SQLAlchemy',         role: 'ORM',                       category: 'database'   },
  alembic:              { name: 'Alembic',            role: 'DB migrations',             category: 'database'   },
  psycopg2:             { name: 'PostgreSQL',         role: 'database driver',           category: 'database'   },
  'psycopg2-binary':    { name: 'PostgreSQL',         role: 'database driver',           category: 'database'   },
  psycopg:              { name: 'PostgreSQL',         role: 'database driver',           category: 'database'   },
  asyncpg:              { name: 'PostgreSQL',         role: 'async database driver',     category: 'database'   },
  pgvector:             { name: 'pgvector',           role: 'vector search',             category: 'database'   },
  pymongo:              { name: 'MongoDB',            role: 'database driver',           category: 'database'   },
  motor:                { name: 'MongoDB',            role: 'async database driver',     category: 'database'   },
  redis:                { name: 'Redis',              role: 'cache / pub-sub',           category: 'database'   },
  pydantic:             { name: 'Pydantic',           role: 'data validation',           category: 'tooling'    },
  'pydantic-settings':  { name: 'Pydantic Settings',  role: 'config management',         category: 'tooling'    },
  pytest:               { name: 'pytest',             role: 'test runner',               category: 'testing'    },
  numpy:                { name: 'NumPy',              role: 'numerical computing',       category: 'tooling'    },
  pandas:               { name: 'pandas',             role: 'data analysis',             category: 'tooling'    },
  'scikit-learn':       { name: 'scikit-learn',       role: 'machine learning',          category: 'framework'  },
  torch:                { name: 'PyTorch',            role: 'deep learning',             category: 'framework'  },
  tensorflow:           { name: 'TensorFlow',         role: 'deep learning',             category: 'framework'  },
  transformers:         { name: 'Transformers',       role: 'ML models',                 category: 'framework'  },
  'sentence-transformers': { name: 'Sentence Transformers', role: 'text embeddings',     category: 'tooling'    },
  langchain:            { name: 'LangChain',          role: 'LLM framework',             category: 'framework'  },
  'llama-index':        { name: 'LlamaIndex',         role: 'LLM framework',             category: 'framework'  },
  openai:               { name: 'OpenAI',             role: 'LLM client',                category: 'tooling'    },
  anthropic:            { name: 'Anthropic',          role: 'LLM client',                category: 'tooling'    },
  httpx:                { name: 'HTTPX',              role: 'HTTP client',               category: 'tooling'    },
  requests:             { name: 'Requests',           role: 'HTTP client',               category: 'tooling'    },

  // --- Rust (Cargo crate names) ---
  axum:                 { name: 'Axum',               role: 'web framework',             category: 'framework'  },
  'actix-web':          { name: 'Actix Web',          role: 'web framework',             category: 'framework'  },
  rocket:               { name: 'Rocket',             role: 'web framework',             category: 'framework'  },
  warp:                 { name: 'Warp',               role: 'web framework',             category: 'framework'  },
  tokio:                { name: 'Tokio',              role: 'async runtime',             category: 'tooling'    },
  sqlx:                 { name: 'SQLx',               role: 'async SQL',                 category: 'database'   },
  diesel:               { name: 'Diesel',             role: 'ORM',                       category: 'database'   },
  serde:                { name: 'Serde',              role: 'serialization',             category: 'tooling'    },

  // --- Go (matched by module path segment) ---
  gin:                  { name: 'Gin',                role: 'web framework',             category: 'framework'  },
  echo:                 { name: 'Echo',               role: 'web framework',             category: 'framework'  },
  fiber:                { name: 'Fiber',              role: 'web framework',             category: 'framework'  },
  chi:                  { name: 'chi',                role: 'HTTP router',               category: 'framework'  },
  gorm:                 { name: 'GORM',               role: 'ORM',                       category: 'database'   },
}

const CATEGORY_ORDER: StackCategory[] = ['language', 'framework', 'database', 'testing', 'tooling', 'other']

function categorySortKey(cat: StackCategory): number {
  const idx = CATEGORY_ORDER.indexOf(cat)
  return idx === -1 ? CATEGORY_ORDER.length : idx
}

// ---------------------------------------------------------------------------
// Project metadata detection
// ---------------------------------------------------------------------------

function remoteToUrl(remote: string): string | null {
  // git@github.com:user/repo.git → https://github.com/user/repo
  const ssh = remote.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`
  // https://github.com/user/repo.git → https://github.com/user/repo
  const https = remote.match(/^(https?:\/\/.+?)(?:\.git)?$/)
  if (https) return https[1]
  return null
}

async function getGitRemoteUrl(repoRoot: string): Promise<string | null> {
  try {
    const git = simpleGit({ baseDir: repoRoot })
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin')
    const url = origin?.refs?.fetch ?? origin?.refs?.push ?? null
    return url ? remoteToUrl(url) : null
  } catch {
    return null
  }
}

function readJsonSafe(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function readTomlSafe(path: string): Record<string, unknown> | null {
  try {
    return parseTOML(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getProjectMeta(repoRoot: string): Promise<ProjectMeta> {
  const repoUrl = await getGitRemoteUrl(repoRoot)

  // Node / TS
  const pkg = readJsonSafe(join(repoRoot, 'package.json'))
  if (pkg) {
    const hasTsInDeps =
      !!(pkg['devDependencies'] as Record<string, unknown> | undefined)?.['typescript']
    const hasTsFiles = existsSync(join(repoRoot, 'tsconfig.json'))
    return {
      name: String(pkg['name'] ?? 'unknown'),
      description: String(pkg['description'] ?? ''),
      version: String(pkg['version'] ?? '0.0.0'),
      language: hasTsInDeps || hasTsFiles ? 'typescript' : 'javascript',
      repoUrl,
    }
  }

  // Python
  const pyproject = readTomlSafe(join(repoRoot, 'pyproject.toml'))
  if (pyproject) {
    const project = pyproject['project'] as Record<string, unknown> | undefined
    const poetry = (pyproject['tool'] as Record<string, unknown> | undefined)?.['poetry'] as
      | Record<string, unknown>
      | undefined
    const src = project ?? poetry ?? {}
    return {
      name: String(src['name'] ?? 'unknown'),
      description: String(src['description'] ?? ''),
      version: String(src['version'] ?? '0.0.0'),
      language: 'python',
      repoUrl,
    }
  }

  // Go
  if (existsSync(join(repoRoot, 'go.mod'))) {
    const gomod = readFileSync(join(repoRoot, 'go.mod'), 'utf8')
    const moduleName = gomod.match(/^module\s+(\S+)/m)?.[1] ?? 'unknown'
    const name = moduleName.split('/').at(-1) ?? moduleName
    return { name, description: '', version: '0.0.0', language: 'go', repoUrl }
  }

  // Rust
  const cargo = readTomlSafe(join(repoRoot, 'Cargo.toml'))
  if (cargo) {
    const pkg2 = cargo['package'] as Record<string, unknown> | undefined
    return {
      name: String(pkg2?.['name'] ?? 'unknown'),
      description: String(pkg2?.['description'] ?? ''),
      version: String(pkg2?.['version'] ?? '0.0.0'),
      language: 'rust',
      repoUrl,
    }
  }

  return { name: repoRoot.split(/[\\/]/).at(-1) ?? 'unknown', description: '', version: '0.0.0', language: 'unknown', repoUrl }
}

// Directories never worth scanning for manifests.
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.next', 'coverage', 'target', 'vendor',
  '.venv', 'venv', 'env', '__pycache__', '.turbo', '.mindr', 'site',
  '.mypy_cache', '.pytest_cache', '.ruff_cache',
])

const MANIFEST_NAMES = new Set(['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml'])

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function safeReaddir(dir: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

// Find dependency manifests across the repo (not just the root) so monorepos
// and projects that keep manifests in subdirectories (server/, packages/*, …)
// are detected. Shallow, bounded, and skips heavy/build directories.
function findManifests(repoRoot: string, maxDepth = 3, cap = 80): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth || found.length >= cap) return
    for (const e of safeReaddir(dir)) {
      if (found.length >= cap) return
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue
        walk(join(dir, e.name), depth + 1)
      } else if (MANIFEST_NAMES.has(e.name) || /^requirements.*\.txt$/i.test(e.name)) {
        found.push(join(dir, e.name))
      }
    }
  }
  walk(repoRoot, 0)
  return found
}

// Normalise a Python requirement spec to its bare package name.
// "uvicorn[standard]>=0.27.0" -> "uvicorn"; "psycopg2-binary>=2.9" -> "psycopg2-binary"
function pyPackageName(spec: string): string {
  return spec.split(/[<>=!~;\s[\]()]/)[0].trim().toLowerCase()
}

// Extract required module paths (e.g. github.com/gin-gonic/gin) from a go.mod.
function parseGoModules(text: string): string[] {
  const mods: string[] = []
  const re = /^\s*(?:require\s+)?([\w.\-/]+\.[\w.\-/]+)\s+v\d/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) mods.push(m[1])
  return mods
}

export function detectStack(repoRoot: string): StackItem[] {
  const deps = new Set<string>()
  const langs = new Set<string>()

  for (const manifest of findManifests(repoRoot)) {
    const base = basename(manifest)

    if (base === 'package.json') {
      langs.add('javascript')
      const pkg = readJsonSafe(manifest)
      if (pkg) {
        for (const k of Object.keys((pkg['dependencies'] as Record<string, unknown>) ?? {})) deps.add(k)
        for (const k of Object.keys((pkg['devDependencies'] as Record<string, unknown>) ?? {})) deps.add(k)
      }
    } else if (base === 'pyproject.toml') {
      langs.add('python')
      const py = readTomlSafe(manifest)
      if (py) {
        const projDeps = (py['project'] as Record<string, unknown> | undefined)?.['dependencies']
        if (Array.isArray(projDeps)) for (const d of projDeps) deps.add(pyPackageName(String(d)))
        const poetry = (py['tool'] as Record<string, unknown> | undefined)?.['poetry'] as
          | Record<string, unknown>
          | undefined
        const poetryDeps = poetry?.['dependencies'] as Record<string, unknown> | undefined
        if (poetryDeps) for (const k of Object.keys(poetryDeps)) deps.add(k.toLowerCase())
      }
    } else if (/^requirements.*\.txt$/i.test(base)) {
      langs.add('python')
      const txt = readFileSafe(manifest)
      if (txt) {
        for (const line of txt.split(/\r?\n/)) {
          const t = line.trim()
          if (!t || t.startsWith('#') || t.startsWith('-')) continue
          deps.add(pyPackageName(t))
        }
      }
    } else if (base === 'go.mod') {
      langs.add('go')
      const txt = readFileSafe(manifest)
      if (txt) {
        for (const mod of parseGoModules(txt)) {
          for (const seg of mod.split('/')) if (KNOWN_DEPS[seg]) deps.add(seg)
        }
      }
    } else if (base === 'Cargo.toml') {
      langs.add('rust')
      const cargo = readTomlSafe(manifest)
      const cdeps = cargo?.['dependencies'] as Record<string, unknown> | undefined
      if (cdeps) for (const k of Object.keys(cdeps)) deps.add(k.toLowerCase())
    }
  }

  if (existsSync(join(repoRoot, 'tsconfig.json'))) deps.add('typescript')
  // TypeScript supersedes the bare JavaScript marker when TS is present.
  if (deps.has('typescript')) {
    langs.delete('javascript')
    langs.add('typescript')
  }

  const seen = new Set<string>()
  const items: StackItem[] = []

  // Emit the detected languages first, based on which manifests are present.
  const LANGUAGE_NAMES: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
  }
  for (const lang of langs) {
    const name = LANGUAGE_NAMES[lang]
    if (name && !seen.has(name)) {
      seen.add(name)
      items.push({ name, role: 'language', category: 'language' })
    }
  }

  for (const dep of deps) {
    const known = KNOWN_DEPS[dep]
    if (known && !seen.has(known.name)) {
      seen.add(known.name)
      items.push({ name: known.name, role: known.role, category: known.category })
    }
  }

  return items.sort((a, b) => {
    const catDiff = categorySortKey(a.category) - categorySortKey(b.category)
    return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name)
  })
}

// ---------------------------------------------------------------------------
// Command detection
//
// Real AGENTS.md/CLAUDE.md files lead with the commands an agent needs to run:
// install, build, test, lint, etc. We extract these from the most authoritative
// source available — package.json scripts and Makefile targets are explicit and
// exact; ecosystem conventions (pytest, go test, cargo) fill gaps for languages
// that don't declare scripts. Root-level only: that's where top-level commands
// live, and guessing per-package commands in a monorepo would mislead.
// ---------------------------------------------------------------------------

// Canonical output order — install first, then the run/verify loop.
const COMMAND_ORDER = ['Install', 'Dev', 'Build', 'Test', 'Lint', 'Typecheck', 'Format', 'Run']

// npm-script name → canonical label. First matching name per label wins.
const NPM_SCRIPT_LABELS: Array<{ label: string; names: string[] }> = [
  { label: 'Dev',       names: ['dev', 'start', 'serve'] },
  { label: 'Build',     names: ['build'] },
  { label: 'Test',      names: ['test'] },
  { label: 'Lint',      names: ['lint'] },
  { label: 'Typecheck', names: ['typecheck', 'type-check', 'tsc', 'check-types'] },
  { label: 'Format',    names: ['format', 'fmt'] },
]

// Makefile target → canonical label.
const MAKE_TARGET_LABELS: Array<{ label: string; names: string[] }> = [
  { label: 'Install', names: ['install', 'setup', 'deps', 'bootstrap'] },
  { label: 'Dev',     names: ['dev', 'run', 'serve', 'start'] },
  { label: 'Build',   names: ['build'] },
  { label: 'Test',    names: ['test'] },
  { label: 'Lint',    names: ['lint'] },
  { label: 'Format',  names: ['format', 'fmt'] },
]

function detectPackageManager(repoRoot: string): 'pnpm' | 'yarn' | 'bun' | 'npm' {
  if (existsSync(join(repoRoot, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(repoRoot, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(repoRoot, 'bun.lockb')) || existsSync(join(repoRoot, 'bun.lock'))) return 'bun'
  return 'npm'
}

// Render the command that runs a given npm script under the detected manager.
function runNpmScript(pm: 'pnpm' | 'yarn' | 'bun' | 'npm', script: string): string {
  if (pm === 'npm') return script === 'test' || script === 'start' ? `npm ${script}` : `npm run ${script}`
  if (pm === 'bun') return `bun run ${script}`
  return `${pm} ${script}` // pnpm / yarn run scripts by bare name
}

export function detectCommands(repoRoot: string): CommandItem[] {
  const byLabel = new Map<string, string>()
  const add = (label: string, command: string): void => {
    if (!byLabel.has(label)) byLabel.set(label, command)
  }

  // 1. package.json scripts — the most explicit, authoritative source.
  const pkg = readJsonSafe(join(repoRoot, 'package.json'))
  if (pkg) {
    const names = new Set(Object.keys((pkg['scripts'] as Record<string, unknown>) ?? {}))
    const pm = detectPackageManager(repoRoot)
    add('Install', pm === 'yarn' ? 'yarn' : `${pm} install`)
    for (const { label, names: candidates } of NPM_SCRIPT_LABELS) {
      const found = candidates.find((n) => names.has(n))
      if (found) add(label, runNpmScript(pm, found))
    }
  }

  // 2. Makefile targets.
  const make = readFileSafe(join(repoRoot, 'Makefile')) ?? readFileSafe(join(repoRoot, 'makefile'))
  if (make) {
    const targets = new Set<string>()
    const re = /^([a-zA-Z][\w-]*)\s*:/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(make)) !== null) targets.add(m[1])
    for (const { label, names } of MAKE_TARGET_LABELS) {
      const found = names.find((n) => targets.has(n))
      if (found) add(label, `make ${found}`)
    }
  }

  // 3. Ecosystem conventions — fill gaps for languages without scripts/Makefile.
  // Python
  const pyprojectPath = join(repoRoot, 'pyproject.toml')
  const pyprojectRaw = readFileSafe(pyprojectPath)
  const rootReqs = ['requirements.txt', 'requirements-dev.txt', 'requirements/dev.txt']
    .find((r) => existsSync(join(repoRoot, r)))
  if (pyprojectRaw || rootReqs) {
    if (pyprojectRaw) {
      const py = readTomlSafe(pyprojectPath)
      const tool = py?.['tool'] as Record<string, unknown> | undefined
      if (existsSync(join(repoRoot, 'uv.lock'))) add('Install', 'uv sync')
      else if (tool?.['poetry']) add('Install', 'poetry install')
      else if (py?.['project']) add('Install', 'pip install -e .')
    }
    if (rootReqs) add('Install', `pip install -r ${rootReqs}`)
    // pytest is the near-universal Python runner; only claim it when it's referenced.
    const usesPytest =
      (pyprojectRaw?.includes('pytest') ?? false) ||
      existsSync(join(repoRoot, 'pytest.ini')) ||
      existsSync(join(repoRoot, 'tox.ini')) ||
      existsSync(join(repoRoot, 'conftest.py'))
    if (usesPytest) add('Test', 'pytest')
  }
  // Go
  if (existsSync(join(repoRoot, 'go.mod'))) {
    add('Build', 'go build ./...')
    add('Test', 'go test ./...')
  }
  // Rust
  if (existsSync(join(repoRoot, 'Cargo.toml'))) {
    add('Build', 'cargo build')
    add('Test', 'cargo test')
    add('Run', 'cargo run')
  }

  return COMMAND_ORDER
    .filter((label) => byLabel.has(label))
    .map((label) => ({ label, command: byLabel.get(label)! }))
}

// ---------------------------------------------------------------------------
// Backend data queries
// ---------------------------------------------------------------------------

export async function queryConventions(backend: MemoryBackend): Promise<ConventionProfile[]> {
  const mems = await backend.listByTags([{ key: 'type', value: 'convention' }])
  mems.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latestByLang = new Map<string, ConventionProfile>()
  for (const m of mems) {
    const lang = m.tags.find((t) => t.key === 'language')?.value
    if (lang && !latestByLang.has(lang) && m.metadata?.profile) {
      latestByLang.set(lang, m.metadata.profile as ConventionProfile)
    }
  }
  return Array.from(latestByLang.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

export async function queryDecisions(backend: MemoryBackend, limit = 5): Promise<MindrMemory[]> {
  const mems = await backend.listByTags([{ key: 'type', value: 'decision' }])
  return mems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
}

export async function queryDebt(backend: MemoryBackend): Promise<MindrMemory[]> {
  const mems = await backend.listByTags([{ key: 'type', value: 'debt' }])
  return mems.sort((a, b) => a.content.localeCompare(b.content))
}

// ---------------------------------------------------------------------------
// Main context gatherer
// ---------------------------------------------------------------------------

export async function gatherContext(repoRoot: string, backend: MemoryBackend): Promise<GenerateContext> {
  const [meta, conventions, decisions, debt] = await Promise.all([
    getProjectMeta(repoRoot),
    queryConventions(backend),
    queryDecisions(backend),
    queryDebt(backend),
  ])
  const stack = detectStack(repoRoot)
  const commands = detectCommands(repoRoot)
  return { meta, commands, stack, conventions, decisions, debt }
}
