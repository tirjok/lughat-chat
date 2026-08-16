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
    // Proto specifies Inter + Amiri (Google Fonts). We use Plus Jakarta Sans +
    // Noto Sans Arabic + Cairo (self-hosted .woff2) for 100% offline operation.
    // See ADR-005 for rationale. The visual difference is acceptable: both Latin
    // fonts are geometric sans-serifs; Arabic is sans-serif (not Naskh-serif).
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      arabic: ['"Noto Sans Arabic"', 'Cairo', 'sans-serif']
    },
    colors: {
      stone: {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403a',
        800: '#292524',
        900: '#1c1917',
        950: '#0c0a09'
      },
      primary: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a'
      },
      gold: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706'
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
  safelist: [
    // Dashboard tiles use dynamic gradient from curriculum.ts data.
    // UnoCSS tree-shakes unused utilities; safelist forces generation.
    'from-teal-700', 'via-teal-800', 'to-teal-900',
    'from-emerald-700', 'via-emerald-800', 'to-emerald-900',
    'from-cyan-700', 'via-cyan-800', 'to-cyan-900',
    'from-sky-700', 'via-sky-800', 'to-sky-900',
    'from-indigo-700', 'via-indigo-800', 'to-indigo-900',
    'from-violet-700', 'via-violet-800', 'to-violet-900'
  ],
  rules: [
    // Custom text gradient utility
    ['text-gradient', {
      'background': 'linear-gradient(to right, #3b82f6, #8b5cf6)',
      '-webkit-background-clip': 'text',
      '-webkit-text-fill-color': 'transparent'
    }]
  ]
})
