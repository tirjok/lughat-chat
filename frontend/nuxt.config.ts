export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@unocss/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    // Proxy to backend in development mode only.
    // In production, Nginx handles all proxying (see Dockerfile).
    proxy: process.env.NODE_ENV === 'production'
      ? {}
      : {
          '/api/': {
            target: 'http://localhost:8000',
            changeOrigin: true,
          },
          '/health': {
            target: 'http://localhost:8000',
            changeOrigin: true,
          },
        }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // Proxy to backend in development mode only.
    // In production, Nginx handles all proxying (see Dockerfile).
    devProxy: {
      '/api/': {
        target: 'http://localhost:8000/api/',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:8000/health',
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
