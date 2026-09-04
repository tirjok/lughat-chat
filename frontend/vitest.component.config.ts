import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  testUtils: {
    startOnBoot: true,
    logToConsole: false
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.component.ts'],
    include: ['tests/components/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['tests/components/LessonPageLeaveCleanup.test.ts', 'tests/components/LessonPageTts.test.ts', 'tests/integration/route-resolution.test.ts', 'tests/integration/cross-page-navigation.test.ts'],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('.', import.meta.url))
      }
    },
    globals: true
  },
  resolve: {
    alias: {
      'vue-router': fileURLToPath(new URL('tests/mocks/nuxt-router.ts', import.meta.url)),
      'nuxt/dist/app/composables/router': fileURLToPath(new URL('tests/mocks/nuxt-router.ts', import.meta.url)),
      'nuxt/dist/app/nuxt': fileURLToPath(new URL('tests/mocks/nuxt-app.ts', import.meta.url))
    }
  }
})
