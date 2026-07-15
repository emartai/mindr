import { describe, it, expect } from 'vitest'
import { detectDebtInUnifiedDiff } from '../../src/debt/detector.js'

describe('detectDebtInUnifiedDiff — instruction-file exclusion', () => {
  it('detects TODO markers added in normal source files', () => {
    const diff = [
      '+++ b/src/app.ts',
      '@@ -0,0 +1,2 @@',
      '+// TODO: validate input',
      '+const x = 1',
    ].join('\n')
    const findings = detectDebtInUnifiedDiff(diff)
    expect(findings).toHaveLength(1)
    expect(findings[0].file).toBe('src/app.ts')
    expect(findings[0].marker).toBe('TODO')
  })

  it('ignores TODO/FIXME quoted inside generated instruction files', () => {
    const diff = [
      '+++ b/AGENTS.md',
      '@@ -0,0 +1,2 @@',
      '+- `src/x.ts:1` — **TODO**: documented debt item',
      '+- `src/y.ts:2` — **FIXME**: another one',
      '+++ b/CLAUDE.md',
      '@@ -0,0 +1,1 @@',
      '+- TODO: keep this out of debt',
    ].join('\n')
    expect(detectDebtInUnifiedDiff(diff)).toHaveLength(0)
  })

  it('keeps line numbers correct for a source file that follows an instruction file', () => {
    const diff = [
      '+++ b/CLAUDE.md',
      '@@ -0,0 +1,1 @@',
      '+- TODO: documentation, ignored',
      '+++ b/lib/util.ts',
      '@@ -0,0 +1,3 @@',
      '+const a = 1',
      '+const b = 2',
      '+// FIXME: real debt here',
    ].join('\n')
    const findings = detectDebtInUnifiedDiff(diff)
    expect(findings).toHaveLength(1)
    expect(findings[0].file).toBe('lib/util.ts')
    expect(findings[0].line).toBe(3)
    expect(findings[0].marker).toBe('FIXME')
  })
})
