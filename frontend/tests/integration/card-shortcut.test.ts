import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Card Shortcut Test ──────────────────────────────────────────────────
// Verify the UnoCSS `card` shortcut resolves to the standardized class string.

describe('Card shortcut', () => {
  it('uno.config.ts card shortcut equals rounded-xl bg-white border border-stone-200 shadow-sm', () => {
    const content = readFileSync(resolve(__dirname, '../../uno.config.ts'), 'utf-8')
    const match = content.match(/'card':\s*'([^']+)'/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('rounded-xl bg-white border border-stone-200 shadow-sm')
  })

  it('card shortcut does NOT contain dark:bg-gray-800', () => {
    const content = readFileSync(resolve(__dirname, '../../uno.config.ts'), 'utf-8')
    const match = content.match(/'card':\s*'([^']+)'/)
    expect(match![1]).not.toContain('dark:bg-gray-800')
  })

  it('card shortcut does NOT contain rounded-lg', () => {
    const content = readFileSync(resolve(__dirname, '../../uno.config.ts'), 'utf-8')
    const match = content.match(/'card':\s*'([^']+)'/)
    expect(match![1]).not.toContain('rounded-lg')
  })

  it('dashboard.vue cards use the card class (which resolves to rounded-xl)', () => {
    const content = readFileSync(
      resolve(__dirname, '../../app/pages/dashboard.vue'),
      'utf-8'
    )
    expect(content).toContain('class="card')
  })

  it('[lesson].vue uses the card class inside the content area', () => {
    const content = readFileSync(
      resolve(__dirname, '../../app/pages/dashboard/level/[level]/[lesson].vue'),
      'utf-8'
    )
    expect(content).toContain('class="card"')
  })
})
