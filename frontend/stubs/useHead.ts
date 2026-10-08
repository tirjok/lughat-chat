// Stub for component tests - provides no-op useHead/useSeoMeta
// so pages can call these during <script setup> evaluation without
// requiring a full Nuxt app instance.
export const useHead: (...args: unknown[]) => void = () => {}
export const useSeoMeta: (...args: unknown[]) => void = () => {}
export const useHeadSafe: (...args: unknown[]) => void = () => {}
