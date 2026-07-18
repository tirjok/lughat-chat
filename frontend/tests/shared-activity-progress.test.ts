import { describe, it, expect } from 'vitest'

describe('shared ActivityProgress interface', () => {
  it('exports ActivityProgress from shared/types', async () => {
    const mod = await import('fs')
    const path = await import('path')
    const content = mod.default.readFileSync(
      path.resolve(__dirname, '../app/shared/types.ts'),
      'utf-8'
    )
    expect(content).toMatch(/export interface ActivityProgress/)
  })

  it('shared ActivityProgress matches the shape used by useProgress', async () => {
    await import('../app/shared/types')
    type SharedActivityProgress = {
      score: number
      status: string
      attempts: number
    }

    const valid: SharedActivityProgress = {
      score: 0.5,
      status: 'in_progress',
      attempts: 1
    }
    expect(valid.score).toBe(0.5)
    expect(valid.status).toBe('in_progress')
    expect(valid.attempts).toBe(1)
  })

  it('useProgress imports ActivityProgress from shared/types, not defining its own', async () => {
    const mod = await import('fs')
    const path = await import('path')
    const content = mod.default.readFileSync(
      path.resolve(__dirname, '../app/composables/useProgress.ts'),
      'utf-8'
    )
    // Must NOT contain its own "export interface ActivityProgress"
    expect(content).not.toMatch(/export interface ActivityProgress/)
    // Must import ActivityProgress from shared
    expect(content).toMatch(/from.*shared.*types/)
  })

  it('useLessons imports ActivityProgress from shared/types, not defining its own', async () => {
    const mod = await import('fs')
    const path = await import('path')
    const content = mod.default.readFileSync(
      path.resolve(__dirname, '../app/composables/useLessons.ts'),
      'utf-8'
    )
    // Must NOT contain its own "export interface ActivityProgress"
    expect(content).not.toMatch(/export interface ActivityProgress/)
    // Must import ActivityProgress from shared
    expect(content).toMatch(/from.*shared.*types/)
  })

  it('useProgress re-exports ActivityProgress for backwards compatibility', async () => {
    const mod = await import('fs')
    const path = await import('path')

    const progressContent = mod.default.readFileSync(
      path.resolve(__dirname, '../app/composables/useProgress.ts'),
      'utf-8'
    )
    const lessonsContent = mod.default.readFileSync(
      path.resolve(__dirname, '../app/composables/useLessons.ts'),
      'utf-8'
    )

    // useProgress re-exports ActivityProgress so existing consumers
    // who imported it from useProgress continue to work.
    expect(progressContent).toMatch(/export type \{ ActivityProgress \}/)

    // useLessons imports it but does NOT re-export (avoids duplicate
    // auto-import warnings from Nuxt's type generator).
    expect(lessonsContent).not.toMatch(/export type \{ ActivityProgress \}/)
  })
})
