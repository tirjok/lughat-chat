// Stub for @motionone/vue — satisfies Vite's import resolver in test environments.
// The vi.mock() in tests/setup.ts overrides this module's animate export during tests.

import type { AnimationControls } from '@motionone/dom'

export const animate = (
  _target: unknown,
  _keyframes: Record<string, unknown>,
  _options?: Record<string, unknown> | number
): AnimationControls => ({
  cancel: () => {}
}) as unknown as AnimationControls
