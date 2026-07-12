import type { Command } from 'commander'
import { getRepoRoot, loadConfig, migrateSqliteToRemembr, SqliteBackend } from '@emartai/mindr-core'
import type { MindrConfig } from '@emartai/mindr-core'
import chalk from 'chalk'

export interface MigrateDeps {
  repoRoot?: string
  config?: MindrConfig
  dryRun?: boolean
  // injectable for testing
  migrate?: (config: MindrConfig) => Promise<{ migrated: number }>
}

export async function runMigrateSqliteToRemembr(deps: MigrateDeps = {}): Promise<void> {
  const { dryRun, repoRoot: depRoot, config: depConfig, migrate: depMigrate } = deps
  const repoRoot = depRoot ?? (await getRepoRoot(process.cwd()))
  const config = depConfig ?? loadConfig(repoRoot)
  const migrateImpl = depMigrate ?? migrateSqliteToRemembr

  if (dryRun) {
    // Dry-run only reads SQLite — no Remembr connection needed
    const sqliteConfig: MindrConfig = {
      ...config,
      storage: { backend: 'sqlite', sqlite_path: config.storage.sqlite_path },
    }
    const sqlite = new SqliteBackend(sqliteConfig)
    const all = await sqlite.listByTags([], 10_000)
    sqlite.close()
    process.stdout.write(
      `${chalk.cyan('DRY RUN')} — would migrate ${chalk.bold(String(all.length))} memories from SQLite → Remembr. No data written.\n`,
    )
    return
  }

  if (config.storage.backend !== 'remembr') {
    throw new Error('Config backend is not "remembr". Update storage.backend first.')
  }

  process.stdout.write('Migrating SQLite → Remembr...\n')
  const { migrated } = await migrateImpl(config)
  process.stdout.write(`${chalk.green('✓')} Migrated ${migrated} memories.\n`)
}

export function addMigrateCommands(program: Command, deps: MigrateDeps = {}): void {
  const migrate = program.command('migrate').description('Migration utilities')

  migrate
    .command('sqlite-to-remembr')
    .description('Copy all SQLite memories to the Remembr backend')
    .option('--dry-run', 'Preview what would be migrated without writing to Remembr')
    .action(async (opts: { dryRun?: boolean }) => {
      await runMigrateSqliteToRemembr({ ...deps, dryRun: opts.dryRun }).catch((err: unknown) => {
        process.stderr.write(`${chalk.red('✗')} ${String(err)}\n`)
        process.exit(1)
      })
    })
}
