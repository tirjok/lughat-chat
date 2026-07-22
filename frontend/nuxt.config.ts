export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
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

  compatibilityDate: '2025-01-15',

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
