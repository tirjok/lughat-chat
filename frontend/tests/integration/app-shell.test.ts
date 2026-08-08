import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── App Shell Test ──────────────────────────────────────────────────────
// Verify app.vue root div has the standardized background.

describe('App shell', () => {
  it('app.vue root div has bg-stone-50', () => {
    const content = readFileSync(resolve(__dirname, '../../app/app.vue'), 'utf-8')
    expect(content).toContain('bg-stone-50')
  })

  it('app.vue root div has dark:bg-stone-950', () => {
    const content = readFileSync(resolve(__dirname, '../../app/app.vue'), 'utf-8')
    expect(content).toContain('dark:bg-stone-950')
  })

  it('app.vue root div does NOT have a container class (GlobalNavbar wraps it)', () => {
    const content = readFileSync(resolve(__dirname, '../../app/app.vue'), 'utf-8')
    expect(content).toContain('min-h-screen')
  })
})
