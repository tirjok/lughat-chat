import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.component.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('.', import.meta.url))
      }
    },
    globals: true
  }
})
