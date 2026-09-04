import { describe, it, expect } from 'vitest'
import { useLessonOrchestrator } from '~/composables/lesson/useLessonOrchestrator'

describe('useLessonOrchestrator | Issue-014', () => {
  describe('default activeSection value', () => {
    it('defaults to the first section name ("Dialogue") when sectionTabs is provided', () => {
      const { activeSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']
      })
      expect(activeSection.value).toBe('Dialogue')
    })
  })

  describe('tab click updates activeSection', () => {
    it('switches to the clicked tab section', () => {
      const { activeSection, navigateToSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']
      })

      expect(activeSection.value).toBe('Dialogue')

      navigateToSection('Pronouns')
      expect(activeSection.value).toBe('Pronouns')
    })

    it('updates currentIndex when switching sections', () => {
      const { currentIndex, navigateToSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']
      })

      expect(currentIndex.value).toBe(0)

      navigateToSection('Grammar')
      expect(currentIndex.value).toBe(4)
    })
  })

  describe('ArrowLeft/ArrowRight navigation', () => {
    it('navigates forward with ArrowRight from first tab', () => {
      const { activeSection, handleArrowKey } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns']
      })

      expect(activeSection.value).toBe('Dialogue')

      handleArrowKey('ArrowRight')
      expect(activeSection.value).toBe('Vocabulary')
    })

    it('navigates backward with ArrowLeft from last tab', () => {
      const { activeSection, handleArrowKey, navigateToSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions']
      })

      navigateToSection('Expressions')
      expect(activeSection.value).toBe('Expressions')

      handleArrowKey('ArrowLeft')
      expect(activeSection.value).toBe('Pronouns')
    })

    it('clamps at start — ArrowLeft from first tab stays on first tab (no wrap)', () => {
      const { activeSection, handleArrowKey } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns']
      })

      expect(activeSection.value).toBe('Dialogue')

      handleArrowKey('ArrowLeft')
      expect(activeSection.value).toBe('Dialogue')
    })

    it('clamps at end — ArrowRight from last tab stays on last tab (no wrap)', () => {
      const { activeSection, handleArrowKey, navigateToSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns']
      })

      navigateToSection('Pronouns')
      expect(activeSection.value).toBe('Pronouns')

      handleArrowKey('ArrowRight')
      expect(activeSection.value).toBe('Pronouns')
    })
  })

  describe('rapid tab mashing', () => {
    it('last write wins — multiple rapid navigations resolve to the last one', () => {
      const { activeSection, navigateToSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']
      })

      navigateToSection('Vocabulary')
      navigateToSection('Pronouns')
      navigateToSection('Grammar')
      navigateToSection('Expressions')

      expect(activeSection.value).toBe('Expressions')
    })

    it('single activeSection ref — exactly one section is ever active', () => {
      const { activeSection, navigateToSection } = useLessonOrchestrator({
        sectionTabs: ['Dialogue', 'Vocabulary', 'Pronouns']
      })

      navigateToSection('Pronouns')
      navigateToSection('Vocabulary')

      const sections = ['Dialogue', 'Vocabulary', 'Pronouns']
      expect(sections.filter(s => s === activeSection.value).length).toBe(1)
      expect(activeSection.value).toBe('Vocabulary')
    })
  })
})
