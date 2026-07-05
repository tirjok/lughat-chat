// Composable: Scroll-entry fade-up animations via IntersectionObserver
// Elements with class "fade-up" are VISIBLE by default.
// When the observer fires, elements get "animate" class (hidden state),
// then "visible" class triggers the spring fade-up animation.
// Uses GPU-safe properties only (opacity, transform, filter).
// Respects prefers-reduced-motion: elements appear instantly without animation.

import { onMounted, onUnmounted, type Ref } from 'vue'

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

  let observer: IntersectionObserver | null = null

  function observe() {
    const container = containerRef.value
    if (!container) return

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate', 'visible')
            onVisible?.(entry.target)
            observer?.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold }
    )

    const fadeUpElements = container.querySelectorAll('.fade-up')
    fadeUpElements.forEach(el => observer!.observe(el))
  }

  function disconnect() {
    observer?.disconnect()
    observer = null
  }

  onMounted(() => {
    // Respect prefers-reduced-motion: skip observation, elements stay visible (no animation)
    const prefersReducedMotion = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

    if (prefersReducedMotion) {
      // Elements are already visible by default — no class changes needed
      return
    }

    observe()
  })

  onUnmounted(() => disconnect())

  return { observe, disconnect }
}
