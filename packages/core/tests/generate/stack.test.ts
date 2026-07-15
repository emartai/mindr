import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectStack, detectCommands, getProjectMeta } from '../../src/generate/context.js'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mindr-stack-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('detectStack', () => {
  it('detects a Python stack from requirements.txt in a subdirectory (monorepo)', () => {
    mkdirSync(join(dir, 'server'), { recursive: true })
    writeFileSync(
      join(dir, 'server', 'requirements.txt'),
      [
        'fastapi>=0.109.0',
        'uvicorn[standard]>=0.27.0',
        'sqlalchemy>=2.0.25',
        'psycopg2-binary>=2.9.9',
        'pgvector>=0.2.5',
        'redis>=5.0.0',
        '# a comment',
        '-r other.txt',
      ].join('\n'),
    )
    const names = detectStack(dir).map((s) => s.name)
    expect(names).toContain('Python') // language marker
    expect(names).toContain('FastAPI')
    expect(names).toContain('Uvicorn')
    expect(names).toContain('SQLAlchemy')
    expect(names).toContain('PostgreSQL')
    expect(names).toContain('pgvector')
    expect(names).toContain('Redis')
  })

  it('detects PEP 621 pyproject.toml dependencies', () => {
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\ndependencies = ["flask>=3.0", "celery>=5.0"]\n')
    const names = detectStack(dir).map((s) => s.name)
    expect(names).toContain('Flask')
    expect(names).toContain('Celery')
  })

  it('detects a JS monorepo package.json in a nested directory', () => {
    mkdirSync(join(dir, 'apps', 'api'), { recursive: true })
    writeFileSync(
      join(dir, 'apps', 'api', 'package.json'),
      JSON.stringify({ dependencies: { express: '^4', pg: '^8' }, devDependencies: { vitest: '^2' } }),
    )
    const names = detectStack(dir).map((s) => s.name)
    expect(names).toContain('JavaScript') // language marker (no tsconfig)
    expect(names).toContain('Express')
    expect(names).toContain('PostgreSQL')
    expect(names).toContain('Vitest')
  })

  it('skips node_modules and returns [] for an otherwise empty repo', () => {
    mkdirSync(join(dir, 'node_modules', 'left-pad'), { recursive: true })
    writeFileSync(
      join(dir, 'node_modules', 'left-pad', 'package.json'),
      JSON.stringify({ dependencies: { react: '^18' } }),
    )
    expect(detectStack(dir)).toEqual([])
  })
})

describe('detectCommands', () => {
  it('extracts npm scripts and uses the detected package manager (pnpm)', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ scripts: { dev: 'vite', build: 'tsc', test: 'vitest', lint: 'eslint .' } }),
    )
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 6.0\n')
    const cmds = detectCommands(dir)
    const map = Object.fromEntries(cmds.map((c) => [c.label, c.command]))
    expect(map['Install']).toBe('pnpm install')
    expect(map['Dev']).toBe('pnpm dev')
    expect(map['Build']).toBe('pnpm build')
    expect(map['Test']).toBe('pnpm test')
    expect(map['Lint']).toBe('pnpm lint')
    // Install must be first in canonical order.
    expect(cmds[0].label).toBe('Install')
  })

  it('uses `npm run <script>` (and bare npm for test) when no lockfile signals another manager', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } }))
    const map = Object.fromEntries(detectCommands(dir).map((c) => [c.label, c.command]))
    expect(map['Install']).toBe('npm install')
    expect(map['Build']).toBe('npm run build')
    expect(map['Test']).toBe('npm test')
  })

  it('parses Makefile targets', () => {
    writeFileSync(join(dir, 'Makefile'), ['install:\n\tpip install -e .', 'test:\n\tpytest', 'lint:\n\truff check'].join('\n'))
    const map = Object.fromEntries(detectCommands(dir).map((c) => [c.label, c.command]))
    expect(map['Install']).toBe('make install')
    expect(map['Test']).toBe('make test')
    expect(map['Lint']).toBe('make lint')
  })

  it('falls back to Python conventions (pip install + pytest) with no scripts', () => {
    writeFileSync(join(dir, 'requirements.txt'), 'fastapi\npytest\n')
    writeFileSync(join(dir, 'conftest.py'), '')
    const map = Object.fromEntries(detectCommands(dir).map((c) => [c.label, c.command]))
    expect(map['Install']).toBe('pip install -r requirements.txt')
    expect(map['Test']).toBe('pytest')
  })

  it('detects Go and Rust conventions', () => {
    writeFileSync(join(dir, 'go.mod'), 'module example.com/app\n\ngo 1.22\n')
    expect(Object.fromEntries(detectCommands(dir).map((c) => [c.label, c.command]))['Test']).toBe('go test ./...')

    rmSync(join(dir, 'go.mod'))
    writeFileSync(join(dir, 'Cargo.toml'), '[package]\nname = "app"\n')
    const rust = Object.fromEntries(detectCommands(dir).map((c) => [c.label, c.command]))
    expect(rust['Build']).toBe('cargo build')
    expect(rust['Test']).toBe('cargo test')
  })

  it('returns [] for a repo with no manifests', () => {
    expect(detectCommands(dir)).toEqual([])
  })

  it('does NOT descend into sub-packages when the root has a run loop', () => {
    // Root package.json provides build+test → single-project repo; sub-package
    // commands must not be appended.
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } }))
    mkdirSync(join(dir, 'packages', 'api'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'api', 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }))
    const labels = detectCommands(dir).map((c) => c.label)
    expect(labels).toContain('Build')
    expect(labels).toContain('Test')
    expect(labels.some((l) => l.includes('('))).toBe(false) // no scoped per-package labels
  })

  it('surfaces per-package commands (scoped by dir) for a polyglot monorepo with only `make setup`', () => {
    writeFileSync(join(dir, 'Makefile'), 'setup:\n\t@echo done\n')
    // Python backend
    mkdirSync(join(dir, 'server'), { recursive: true })
    writeFileSync(join(dir, 'server', 'pyproject.toml'), '[project]\nname="srv"\n[tool.pytest.ini_options]\n')
    // TS SDK
    mkdirSync(join(dir, 'sdk', 'typescript'), { recursive: true })
    writeFileSync(
      join(dir, 'sdk', 'typescript', 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } }),
    )
    const map = Object.fromEntries(detectCommands(dir).map((c) => [c.label, c.command]))
    expect(map['Install']).toBe('make setup') // root command still first
    expect(map['Test (server)']).toBe('cd server && pytest')
    expect(map['Test (sdk/typescript)']).toBe('cd sdk/typescript && npm test')
    expect(map['Build (sdk/typescript)']).toBe('cd sdk/typescript && npm run build')
  })

  it('does not emit pytest for a Python sub-package that never references it', () => {
    writeFileSync(join(dir, 'Makefile'), 'setup:\n\t@echo done\n')
    mkdirSync(join(dir, 'lib'), { recursive: true })
    writeFileSync(join(dir, 'lib', 'requirements.txt'), 'requests\n') // no pytest anywhere
    const labels = detectCommands(dir).map((c) => c.label)
    expect(labels.some((l) => l.startsWith('Test ('))).toBe(false)
  })
})

describe('getProjectMeta', () => {
  it('labels a subdir-manifest monorepo as `mixed`, not `unknown`', async () => {
    // No manifest at root; Python in server/, TypeScript in web/.
    mkdirSync(join(dir, 'server'), { recursive: true })
    writeFileSync(join(dir, 'server', 'requirements.txt'), 'fastapi\n')
    mkdirSync(join(dir, 'web'), { recursive: true })
    writeFileSync(join(dir, 'web', 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5' } }))
    writeFileSync(join(dir, 'web', 'tsconfig.json'), '{}')
    const meta = await getProjectMeta(dir)
    expect(meta.language).toBe('mixed')
  })

  it('names a single subdir language when the repo is uniform', async () => {
    mkdirSync(join(dir, 'service'), { recursive: true })
    writeFileSync(join(dir, 'service', 'requirements.txt'), 'flask\n')
    const meta = await getProjectMeta(dir)
    expect(meta.language).toBe('python')
  })

  it('still reports unknown when there are no manifests anywhere', async () => {
    const meta = await getProjectMeta(dir)
    expect(meta.language).toBe('unknown')
  })
})
