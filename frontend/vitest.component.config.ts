import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.component.ts'],
    include: ['tests/components/**/*.test.{ts,tsx}'],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('.', import.meta.url))
      }
    },
    globals: true
  },
  resolve: {
    alias: {
      '@nuxtjs/seo': fileURLToPath(new URL('tests/mocks/nuxtjs-seo.ts', import.meta.url)),
      'nuxt/dist/app/composables/router': fileURLToPath(new URL('tests/mocks/nuxt-router.ts', import.meta.url)),
      'nuxt/dist/app/nuxt': fileURLToPath(new URL('tests/mocks/nuxt-app.ts', import.meta.url))
    }
  }
})
