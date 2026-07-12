import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs'
import { join, dirname, isAbsolute } from 'path'
import { platform } from 'process'
import { execFileSync } from 'child_process'

const HOOK_BEGIN = '# >>> mindr-begin <<<'
const HOOK_END = '# >>> mindr-end <<<'
// Guarded so it can never disrupt a commit: it skips silently when `mindragent`
// is not on PATH, and always exits 0 (post-commit hooks should be invisible).
const HOOK_BODY =
  'command -v mindragent >/dev/null 2>&1 && mindragent internal on-commit "$(git rev-parse HEAD)" || true'

const MINDR_BLOCK = `${HOOK_BEGIN}\n${HOOK_BODY}\n${HOOK_END}`

// Resolve the repo's hooks directory, honoring core.hooksPath (set by Husky,
// lefthook, the pre-commit framework, …), git worktrees, and submodules.
// Without this, writing to a hardcoded .git/hooks silently does nothing on any
// repo that redirects hooks elsewhere. Falls back to .git/hooks if git can't
// be run.
function resolveHooksDir(repoRoot: string): string {
  try {
    const out = execFileSync('git', ['-C', repoRoot, 'rev-parse', '--git-path', 'hooks'], {
      encoding: 'utf8',
    }).trim()
    if (!out) return join(repoRoot, '.git', 'hooks')
    return isAbsolute(out) ? out : join(repoRoot, out)
  } catch {
    return join(repoRoot, '.git', 'hooks')
  }
}

function hookPath(repoRoot: string): string {
  return join(resolveHooksDir(repoRoot), 'post-commit')
}

// Installs the mindr post-commit hook. Idempotent. Returns the path written to
// (which honors core.hooksPath) so callers can report it accurately.
export function installPostCommitHook(repoRoot: string): string {
  const path = hookPath(repoRoot)
  let existing = ''

  if (existsSync(path)) {
    existing = readFileSync(path, 'utf8')
    // Already installed — do nothing.
    if (existing.includes(HOOK_BEGIN)) return path
  } else {
    // A custom core.hooksPath directory may not exist yet.
    mkdirSync(dirname(path), { recursive: true })
  }

  let content: string
  if (existing) {
    // Append the mindr block after existing content, preserving it (e.g. a
    // Husky-managed post-commit hook already living here).
    content = existing.trimEnd() + '\n' + MINDR_BLOCK + '\n'
  } else {
    content = '#!/bin/sh\n' + MINDR_BLOCK + '\n'
  }

  // Always write LF endings.
  writeFileSync(path, content.replace(/\r\n/g, '\n'), { encoding: 'utf8' })

  if (platform !== 'win32') {
    chmodSync(path, 0o755)
  }

  return path
}

export function uninstallPostCommitHook(repoRoot: string): void {
  const path = hookPath(repoRoot)
  if (!existsSync(path)) return

  const content = readFileSync(path, 'utf8')
  if (!content.includes(HOOK_BEGIN)) return

  // Remove the mindr block (begin marker through end marker, inclusive).
  const lines = content.split('\n')
  const out: string[] = []
  let inside = false
  for (const line of lines) {
    if (line === HOOK_BEGIN) {
      inside = true
      continue
    }
    if (line === HOOK_END) {
      inside = false
      continue
    }
    if (!inside) out.push(line)
  }

  const result = out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
  writeFileSync(path, result, { encoding: 'utf8' })
}
