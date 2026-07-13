import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'jsdom'
      }
    },
    globals: true,
    setupFiles: ['./tests/setup.component.ts'],
    exclude: ['node_modules/**', 'tests/useHealthPoll.test.ts']
  }
})
