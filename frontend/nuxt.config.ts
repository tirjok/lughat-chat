export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxt/image',
    '@unocss/nuxt'
  ],
  devtools: {
    enabled: true
  },

  // All fonts are self-hosted (100% offline). Phosphor Icons loaded via CDN.
  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        }
      ],
      script: [
        {
          src: 'https://unpkg.com/@phosphor-icons/web',
          type: 'text/javascript'
        }
      ]
    }
  },

  css: ['~/assets/css/main.css'],
  routeRules: {
    '/': { prerender: true },
    '/dashboard': { prerender: false },
    '/dashboard/level/**': { prerender: false }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // Proxy to backend in development mode only.
    // In production, Nginx handles all proxying (see Dockerfile).
    devProxy: {
      '/api/': {
        target: 'http://localhost:9000/api/',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:9000/health',
        changeOrigin: true
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // Nuxt test utilities configuration
  testUtils: {
    startOnBoot: true,
    logToConsole: true
  },

  // UnoCSS configuration
  unocss: {
    // Options will be read from uno.config.ts
  }
})
