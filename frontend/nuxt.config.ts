export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@unocss/nuxt'
  ],
  devtools: {
    enabled: true
  },

  // Plus Jakarta Sans for UI labels (Inter banned — premium agency font)
  // Cairo for Arabic text + Phosphor Icons for sleek, modern icons
  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        }
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous'
        },
        {
          href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
          rel: 'stylesheet'
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

  // UnoCSS configuration
  unocss: {
    // Options will be read from uno.config.ts
  }
})
