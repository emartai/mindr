import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Command } from 'commander'
import {
  getRepoRoot,
  getBackend,
  installPostCommitHook,
  detect,
} from '@emartai/mindr-core'
import type { MemoryBackend, MindrConfig } from '@emartai/mindr-core'
import chalk from 'chalk'

type BackendChoice = 'sqlite' | 'remembr'

export interface InitAnswers {
  backendChoice: BackendChoice
  remembrUrl?: string
}

export interface InitDeps {
  backend?: MemoryBackend
  repoRoot?: string
  answers?: InitAnswers  // pre-supply to skip interactive prompts
  skipScan?: boolean     // skip convention detection (tests)
}

function buildConfigToml(choice: BackendChoice, remembrUrl?: string): string {
  if (choice === 'remembr') {
    return [
      '[storage]',
      'backend = "remembr"',
      'sqlite_path = ".mindr/mindr.sqlite"',
      '',
      '[remembr]',
      `base_url = "${remembrUrl ?? ''}"`,
      '',
    ].join('\n')
  }
  return [
    '[storage]',
    'backend = "sqlite"',
    'sqlite_path = ".mindr/mindr.sqlite"',
    '',
  ].join('\n')
}

async function gatherAnswers(): Promise<InitAnswers> {
  const { select, input } = await import('@inquirer/prompts')
  const backendChoice = (await select({
    message: 'Where should Mindr store memories?',
    choices: [
      { name: 'Local SQLite  (no setup required)', value: 'sqlite' },
      { name: 'Remembr cloud (requires API key)', value: 'remembr' },
    ],
  })) as BackendChoice

  let remembrUrl: string | undefined
  if (backendChoice === 'remembr') {
    remembrUrl = await input({ message: 'Remembr base URL:' })
  }
  return { backendChoice, remembrUrl }
}

// Ensure an entry is present in the repo's .gitignore so Mindr's local SQLite
// DB and config are never committed. Creates .gitignore if absent; appends only
// when the entry isn't already there (trailing-slash-insensitive).
function ensureGitignored(repoRoot: string, entry: string): void {
  const gitignorePath = join(repoRoot, '.gitignore')
  let content = ''
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf8')
    const normalized = entry.replace(/\/$/, '')
    const alreadyPresent = content
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/\/$/, ''))
      .includes(normalized)
    if (alreadyPresent) return
  }
  const prefix = content.length > 0 && !content.endsWith('\n') ? '\n' : ''
  writeFileSync(gitignorePath, `${content}${prefix}${entry}\n`, 'utf8')
}

export async function runInit(deps: InitDeps = {}): Promise<void> {
  const repoRoot =
    deps.repoRoot ?? (await getRepoRoot(process.cwd()).catch(() => null))
  if (!repoRoot) {
    throw new Error('Not a git repository. Run git init first.')
  }
  // Explicitly verify this is a git repo even when repoRoot was supplied
  // directly — the hook installer no longer fails on a missing .git, so init
  // must guard the non-git case itself.
  if (!existsSync(join(repoRoot, '.git'))) {
    throw new Error('Not a git repository. Run git init first.')
  }

  const answers = deps.answers ?? (await gatherAnswers())

  // Write config
  const mindrDir = join(repoRoot, '.mindr')
  mkdirSync(mindrDir, { recursive: true })
  // Keep the local SQLite DB and config out of version control.
  ensureGitignored(repoRoot, '.mindr/')
  const configPath = join(mindrDir, 'config.toml')
  writeFileSync(configPath, buildConfigToml(answers.backendChoice, answers.remembrUrl), 'utf8')

  // Install hook — idempotent, installPostCommitHook guards against double-install.
  // Returns the real path written (honors core.hooksPath).
  const installedHookPath = installPostCommitHook(repoRoot)

  // First convention scan (non-fatal)
  if (!deps.skipScan) {
    try {
      const config: MindrConfig = {
        project_name: undefined,
        language: undefined,
        paths_ignored: undefined,
        remembr: { base_url: answers.remembrUrl },
        storage: { backend: answers.backendChoice, sqlite_path: '.mindr/mindr.sqlite' },
        embeddings: {},
      }
      const backend = deps.backend ?? getBackend(config)
      const profiles = await detect(repoRoot)
      for (const profile of profiles) {
        await backend.store({
          content: `Convention profile for ${profile.language}`,
          role: 'system',
          tags: [
            { key: 'type', value: 'convention' },
            { key: 'language', value: profile.language },
          ],
          metadata: { language: profile.language, profile },
        })
      }
    } catch {
      // non-fatal — first scan failing must not block setup
    }
  }

  const alreadyExists = existsSync(configPath)
  process.stdout.write(
    [
      '',
      `${chalk.green('✓')} ${chalk.bold('Mindr initialized')}`,
      '',
      `  ${chalk.cyan('Backend:')} ${answers.backendChoice}`,
      `  ${chalk.cyan('Config:')}  ${configPath}`,
      `  ${chalk.cyan('Hook:')}    ${installedHookPath}`,
      '',
    ].join('\n'),
  )
  void alreadyExists
}

export function addInitCommand(program: Command, deps: InitDeps = {}): void {
  program
    .command('init')
    .description('Initialize Mindr in the current git repository')
    .option('--backend <type>', 'backend type: sqlite or remembr (skips prompt)', '')
    .option('--remembr-url <url>', 'Remembr base URL (used with --backend=remembr)', '')
    .action(async (opts: { backend?: string; remembrUrl?: string }) => {
      const mergedDeps: InitDeps = { ...deps }
      if (opts.backend === 'sqlite' || opts.backend === 'remembr') {
        mergedDeps.answers = {
          backendChoice: opts.backend,
          remembrUrl: opts.backend === 'remembr' ? (opts.remembrUrl ?? '') : undefined,
        }
      }
      await runInit(mergedDeps).catch((err: unknown) => {
        process.stderr.write(`${chalk.red('✗')} ${String(err)}\n`)
        process.exit(1)
      })
    })
}
