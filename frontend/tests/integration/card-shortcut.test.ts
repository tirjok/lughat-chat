import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Card Class Usage Test ────────────────────────────────────────────────
// Verify that dashboard pages use the 'card' class string directly.
// (The UnoCSS `card` shortcut was removed; components now use the full class string.)

describe('Card class usage', () => {
  it('dashboard/index.vue cards use the card class (which resolves to rounded-xl)', () => {
    const content = readFileSync(
      resolve(__dirname, '../../app/pages/dashboard/index.vue'),
      'utf-8'
    )
    expect(content).toContain('card')
  })

  it('[lesson].vue uses the card class inside the content area', () => {
    const content = readFileSync(
      resolve(__dirname, '../../app/pages/dashboard/level/[level]/[lesson].vue'),
      'utf-8'
    )
    expect(content).toContain('class="card"')
  })
})
