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
        900: '#050505',
        800: '#0F0E0C',
        700: '#1A1714',
        600: '#2A2622'
      },
      gold: {
        DEFAULT: '#C8A45C',
        dim: 'rgba(200, 164, 92, 0.15)',
        glow: 'rgba(200, 164, 92, 0.3)',
        bright: '#E8C878'
      },
      // Gold-spectrum scoring: bright gold → amber-warn → error
      // Color-blind safe when paired with icons + text labels
      success: '#E8C878',
      warn: '#D4883E',
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
    // WCAG AA: 12% white border (was 6%, now meets 3:1 contrast)
    'glass-card': 'rounded-[1.5rem] bg-studio-800/80 backdrop-blur-xl border border-white/[0.12] shadow-ambient',
    'bezel': 'rounded-[2rem] p-1.5 bg-white/[0.02] ring-1 ring-white/[0.12]',
    'bezel-inner': 'rounded-[calc(2rem-0.375rem)] bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]',
    'eyebrow-badge': 'rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-gold-dim text-gold',
    'pill-btn': 'rounded-full px-6 py-3 font-semibold text-sm tracking-wide bg-gold text-studio-900 hover:bg-gold/90 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]',
    // WCAG AA: 12% white border (was 4%)
    'bento-card': 'rounded-[1.5rem] bg-studio-800/60 border border-white/[0.12] shadow-soft',
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
