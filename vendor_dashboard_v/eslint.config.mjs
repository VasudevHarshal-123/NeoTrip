// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  files: ['**/*.ts', '**/*.vue', '**/*.tsx'], rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'vue/require-prop-types': 'off',
    'no-console': 'off',
    'semi': ['error', 'always'],
    '@stylistic/semi': ['error', 'always'],
    'prefer-template': 'error',
    'max-len': ['error', {
      code: 120,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
  },
})
