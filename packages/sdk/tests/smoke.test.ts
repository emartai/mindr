import { describe, it, expect } from 'vitest'
import * as mod from '../src/index.js'

describe('smoke', () => {
  it('exports an object', () => {
    expect(typeof mod).toBe('object')
  })

  it('exports VERSION', () => {
    expect(typeof mod.VERSION).toBe('string')
  })
})
