import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectStack } from '../../src/generate/context.js'

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
