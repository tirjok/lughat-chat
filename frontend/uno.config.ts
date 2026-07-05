import {
  defineConfig,
  presetWind3,
  presetTypography,
  transformerDirectives
} from 'unocss'

export default defineConfig({
  transformers: [
    transformerDirectives()
  ],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      arabic: ['"Noto Sans Arabic"', 'Cairo', 'sans-serif']
    },
    colors: {
      studio: {
        900: '#121212',
        800: '#1A1A1A',
        700: '#333333'
      },
      sunrise: {
        orange: '#FF512F',
        magenta: '#DD2476'
      }
    },
    // Match Tailwind CSS v3 (sample design) shadow values exactly
    // UnoCSS presetWind3 uses slightly different values for shadow-2xl
    boxShadow: {
      '2xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)'
    },
    // Phone-specific breakpoints for responsive design
    breakpoints: {
      'xs': '375px',
      'sm': '414px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    }
  },
  presets: [
    presetWind3(),
    presetTypography({
      extend: {
        h1: {
          fontSize: '2.25rem',
          fontWeight: '700'
        }
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
