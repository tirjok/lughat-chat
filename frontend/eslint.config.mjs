// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import stylistic from '/Users/d504904/dev/tirjok/lughat-chat/node_modules/.pnpm/@stylistic+eslint-plugin@5.10.0_eslint@10.8.0_jiti@2.7.0_supports-color@10.2.2_/node_modules/@stylistic/eslint-plugin/dist/index.js'

export default withNuxt(
  stylistic.configs['flat/recommended'],
  {
    rules: {
      // Suppress: Nuxt ESLint config bug reports this on files without blank lines
      '@stylistic/no-multiple-empty-lines': 'off',
      'no-multiple-empty-lines': 'off'
    }
  }
  // Your custom configs here
)
