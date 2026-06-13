import {
  defineConfig,
  presetUno,
  presetIcons,
  presetTypography,
  presetWebFonts,
  transformerDirectives
} from 'unocss'

export default defineConfig({
  transformers: [
    transformerDirectives()
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      arabic: ['Cairo', 'sans-serif']
    },
    colors: {
      studio: {
        900: '#121212',
        800: '#1A1A1A',
        700: '#2A2A2A'
      },
      sunrise: {
        orange: '#FF512F',
        magenta: '#DD2476'
      }
    }
  },
  presets: [
    presetUno(),
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        verticalAlign: 'middle'
      },
      collections: {
        'lucide': () => import('@iconify-json/lucide/icons.json').then(i => i.default as object),
        'simple-icons': () => import('@iconify-json/simple-icons/icons.json').then(i => i.default as object)
      }
    }),
    presetTypography({
      extend: {
        h1: {
          fontSize: '2.25rem',
          fontWeight: '700'
        }
      }
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Cairo'
      }
    })
  ],
  shortcuts: {
    'btn': 'px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors',
    'card': 'rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800',
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between'
  },
  rules: [
    // Custom text gradient utility
    ['text-gradient', {
      'background': 'linear-gradient(to right, #3b82f6, #8b5cf6)',
      '-webkit-background-clip': 'text',
      '-webkit-text-fill-color': 'transparent'
    }]
  ]
})
