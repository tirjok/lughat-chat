import { shallowRef, ref } from 'vue'

export interface UseLessonOrchestratorOptions {
  sectionTabs: string[]
  defaultSection?: string
}

export function useLessonOrchestrator(options: UseLessonOrchestratorOptions) {
  const { sectionTabs, defaultSection } = options
  const activeSection = shallowRef<string | undefined>(defaultSection ?? sectionTabs[0] ?? 'Dialogue')
  const currentIndex = ref(sectionTabs.indexOf(activeSection.value ?? 'Dialogue'))

  const navigateToSection = (sectionName: string): void => {
    if (sectionTabs.includes(sectionName)) {
      activeSection.value = sectionName
      currentIndex.value = sectionTabs.indexOf(sectionName)
    }
  }

  const navigateNext = (): void => {
    const nextIndex = currentIndex.value + 1
    if (nextIndex < sectionTabs.length) {
      activeSection.value = sectionTabs[nextIndex]
      currentIndex.value = nextIndex
    }
  }

  const navigatePrevious = (): void => {
    const prevIndex = currentIndex.value - 1
    if (prevIndex >= 0) {
      activeSection.value = sectionTabs[prevIndex]
      currentIndex.value = prevIndex
    }
  }

  const handleArrowKey = (key: 'ArrowLeft' | 'ArrowRight'): void => {
    if (key === 'ArrowRight') {
      navigateNext()
    } else if (key === 'ArrowLeft') {
      navigatePrevious()
    }
  }

  return {
    activeSection,
    currentIndex,
    navigateToSection,
    navigateNext,
    navigatePrevious,
    handleArrowKey
  }
}
