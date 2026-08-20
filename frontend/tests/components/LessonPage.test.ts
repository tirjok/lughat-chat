import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const lessonPagePath = resolve(__dirname, '../../app/pages/dashboard/level/[level]/[lesson].vue')

describe('dashboard/level/[level]/[lesson].vue | Issue-002: LessonHero wiring', () => {
  it('passes arabicTitle from currentLessonData to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire arabicTitle from currentLessonData
    expect(content).to.contain(':arabic-title="currentLessonData?.arabicTitle"')
  })

  it('passes estimatedTime from computed value to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire estimatedTime
    expect(content).to.contain(':estimated-time')
  })

  it('passes scenes from computed value to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire scenes
    expect(content).to.contain(':scenes')
  })

  it('passes audioType to LessonHero', () => {
    // Arrange
    const content = readFileSync(lessonPagePath, 'utf-8')

    // Act & Assert — the template must wire audioType
    expect(content).to.contain(':audio-type')
  })
})
