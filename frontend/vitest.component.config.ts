import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.component.ts'],
    exclude: ['node_modules/**', 'tests/useHealthPoll.test.ts'],
  },
})
