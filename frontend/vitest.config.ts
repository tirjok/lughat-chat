import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  resolve: {
    alias: {
      '@motionone/vue': import.meta.dirname + '/tests/stubs/motionone-vue.ts'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/composables/**/*.test.ts', 'tests/data/**/*.test.ts'],
    environmentOptions: {
      nuxt: { rootDir: '.' }
    },
    // Suppress harness-level console output (Nuxt app shell warnings,
    // composable error logging) so CI logs stay clean. Tests that need
    // to verify error handling can re-enable console.error via
    // vi.spyOn(console, 'error').mockImplementation(console.error).
    logHeapUsage: false,
    onConsoleLog: () => false
  }
})
