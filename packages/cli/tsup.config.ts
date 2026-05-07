import { defineConfig } from 'tsup'
import { cpSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')) as { version: string }

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    platform: 'node',
    dts: false,
    sourcemap: true,
    external: ['simple-git', '@kwsites/file-exists', '@kwsites/promise-deferred'],
    define: { __MINDR_VERSION__: JSON.stringify(version) },
    banner: { js: '#!/usr/bin/env node' },
    onSuccess: async () => {
      cpSync('src/ui/static', 'dist/static', { recursive: true })
    },
  },
])
