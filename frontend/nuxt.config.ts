export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@unocss/nuxt',
    '@vueuse/nuxt'
  ],

  // Domain-grouped components. pathPrefix:false keeps names flat
  // (VoiceSelector, not StudioVoiceSelector) so nested dirs don't rename
  // auto-imported components - zero template churn.
  components: [
    { path: '~/components', pathPrefix: false }
  ],
  // Explicit composable dirs (elk pattern) so domain subdirs auto-import.
  imports: {
    dirs: [
      '~/composables',
      '~/composables/studio',
      '~/composables/lesson',
      '~/composables/common'
    ]
  },
  devtools: {
    enabled: true
  },

  // All fonts are self-hosted (100% offline). Phosphor Icons loaded via CDN.
  app: {
    head: {
      title: 'LughatChat — AI Arabic Speech Synthesis',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        },
        { name: 'description', content: 'Text-to-speech for Arabic learning. Generate natural Arabic speech with customizable voices, speed, and pronunciation.' },
        { property: 'og:title', content: 'LughatChat — AI Arabic Speech Synthesis' },
        { property: 'og:description', content: 'Text-to-speech for Arabic learning. Generate natural Arabic speech with customizable voices, speed, and pronunciation.' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' }
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
