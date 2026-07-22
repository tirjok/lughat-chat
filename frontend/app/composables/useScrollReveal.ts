// Composable: Scroll-entry fade-up animations via VueUse useIntersectionObserver
// Elements with class "fade-up" are VISIBLE by default.
// When the observer fires, elements get "animate" class (hidden state),
// then "visible" class triggers the spring fade-up animation.
// Uses GPU-safe properties only (opacity, transform, filter).
// Respects prefers-reduced-motion: elements appear instantly without animation.

import { useIntersectionObserver } from '@vueuse/core'
import type { Ref } from 'vue'

export interface UseScrollRevealOptions {
  /** Root margin for IntersectionObserver (e.g., '0px 0px -80px 0px') */
  rootMargin?: string
  /** Threshold for triggering (0–1) */
  threshold?: number
  /** Callback when element becomes visible */
  onVisible?: (el: Element) => void
}

export function useScrollReveal(
  containerRef: Ref<HTMLElement | null>,
  options: UseScrollRevealOptions = {}
) {
  const {
    rootMargin = '0px 0px -60px 0px',
    threshold = 0.1,
    onVisible
  } = options

  function observe() {
    const container = containerRef.value
    if (!container) return

    const fadeUpElements = Array.from(container.querySelectorAll('.fade-up')) as (HTMLElement | SVGElement | null | undefined)[]
    if (fadeUpElements.length === 0) return

    // VueUse: declarative IntersectionObserver — auto-cleanup on stop
    useIntersectionObserver(
      fadeUpElements,
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate', 'visible')
            onVisible?.(entry.target)
          }
        })
      },
      { rootMargin, threshold }
    )
  }

  return { observe }
}
