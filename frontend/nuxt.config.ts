export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
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
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // Proxy to backend in development mode only.
    // In production, Nginx handles all proxying (see Dockerfile).
    // When running in Docker dev mode, proxy to the backend container
    // by its Docker Compose service name (backend-dev).
    devProxy: {
      '/api/': {
        target: process.env.NODE_ENV === 'docker'
          ? 'http://backend-dev:8000/api/'
          : 'http://localhost:9000/api/',
        changeOrigin: true
      },
      '/health': {
        target: process.env.NODE_ENV === 'docker'
          ? 'http://backend-dev:8000/health'
          : 'http://localhost:9000/health',
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

  // UnoCSS configuration
  unocss: {
    // Options will be read from uno.config.ts
  }
})
