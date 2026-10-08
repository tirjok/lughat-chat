import type { AnimationControls } from '@motionone/dom'

declare module '@motionone/vue' {
  export const animate: (
    target: unknown,
    keyframes: Record<string, unknown>,
    options?: Record<string, unknown> | number
  ) => AnimationControls
}
