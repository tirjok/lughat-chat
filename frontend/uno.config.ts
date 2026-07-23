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
        900: '#0C0A09',
        800: '#1A1714',
        700: '#221F1B',
        600: '#2A2622'
      },
      gold: {
        DEFAULT: '#C8A45C',
        dim: 'rgba(200, 164, 92, 0.15)',
        glow: 'rgba(200, 164, 92, 0.3)'
      },
      ink: {
        DEFAULT: '#E8E0D4',
        dim: '#8A7E72'
      },
      success: '#5CB87A',
      error: '#B85C38'
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
    'btn': 'px-4 py-2 rounded font-semibold text-sm tracking-wide bg-gold text-studio-900 hover:bg-gold/90 transition-colors active:scale-[0.98]',
    'card': 'rounded-lg border border-white/[0.04] bg-studio-800',
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between'
  },
  rules: [
    ['text-gold-gradient', {
      'background': 'linear-gradient(to right, #C8A45C, #E8C878)',
      '-webkit-background-clip': 'text',
      '-webkit-text-fill-color': 'transparent'
    }]
  ]
})
