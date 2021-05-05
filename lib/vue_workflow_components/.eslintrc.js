module.exports = {
  root: true,
  plugins: [
    '@typescript-eslint/eslint-plugin',
  ],
  env: {
    node: true
  },
  'extends': [
    'plugin:vue/essential',
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  },
  ignorePatterns: ["**/*test.ts", "**/*.js"],
}
