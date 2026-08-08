import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Layout Consistency Tests ────────────────────────────────────────────
// Verify all dashboard pages use the standardized layout primitives.

describe('Layout consistency — dashboard pages', () => {
  const base = resolve(__dirname, '../../app/pages/dashboard')

  it('dashboard.vue uses max-w-7xl (not max-w-6xl)', () => {
    const content = readFileSync(resolve(__dirname, '../../app/pages/dashboard.vue'), 'utf-8')
    expect(content).toContain('max-w-7xl')
    expect(content).not.toContain('max-w-6xl')
  })

  it('dashboard.vue page title uses text-3xl md:text-4xl', () => {
    const content = readFileSync(resolve(__dirname, '../../app/pages/dashboard.vue'), 'utf-8')
    expect(content).toContain('text-3xl md:text-4xl')
    expect(content).not.toContain('text-2xl md:text-3xl')
  })

  it('dashboard/level/[level]/index.vue uses max-w-7xl (not max-w-6xl)', () => {
    const content = readFileSync(resolve(base, 'level/[level]/index.vue'), 'utf-8')
    expect(content).toContain('max-w-7xl')
    expect(content).not.toContain('max-w-6xl')
  })

  it('dashboard/level/[level]/index.vue page title uses text-3xl md:text-4xl', () => {
    const content = readFileSync(resolve(base, 'level/[level]/index.vue'), 'utf-8')
    expect(content).toContain('text-3xl md:text-4xl')
    expect(content).not.toContain('text-2xl md:text-3xl')
  })

  it('dashboard/level/[level]/[lesson].vue uses max-w-7xl (not max-w-6xl)', () => {
    const content = readFileSync(resolve(base, 'level/[level]/[lesson].vue'), 'utf-8')
    expect(content).toContain('max-w-7xl')
    expect(content).not.toContain('max-w-6xl')
  })

  it('dashboard/level/[level]/[lesson].vue page title uses text-3xl md:text-4xl', () => {
    const content = readFileSync(resolve(base, 'level/[level]/[lesson].vue'), 'utf-8')
    // LessonHero component handles the responsive title sizing
    const heroContent = readFileSync(resolve(__dirname, '../../app/components/LessonHero.vue'), 'utf-8')
    expect(heroContent).toContain('text-2xl md:text-3xl lg:text-4xl')
    // Legacy check: lesson page no longer has its own heading class
    expect(content).not.toContain('text-3xl md:text-4xl')
  })
})
