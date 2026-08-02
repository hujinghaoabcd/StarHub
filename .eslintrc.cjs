module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    '@vue/eslint-config-typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'backups/',
    'docs/.vitepress/cache/',
    'docs/.vitepress/dist/'
  ],
  overrides: [
    {
      files: ['server/**/*.js'],
      env: {
        browser: false,
        node: true
      },
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      files: ['public/**/*.js'],
      env: {
        browser: true,
        node: false
      },
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      files: ['functions/**/*.ts'],
      globals: {
        KVNamespace: 'readonly',
        PagesFunction: 'readonly'
      }
    }
  ],
  rules: {
    'no-console': 'off',
    'no-extra-semi': 'warn',
    'prefer-const': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ]
  }
}
