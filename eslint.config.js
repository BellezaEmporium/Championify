import neostandard from 'neostandard'

export default neostandard({
  parserOptions: {
    ecmaVersion: 'latest', // Modern JavaScript support
    sourceType: 'module',  // Enable ES6 module syntax
    ecmaFeatures: {
      jsx: false            // Marko does not use JSX
    }
  },
  env: [
    'browser',         // Since Electron uses the browser context
    'node',            // Node.js environment for backend and Electron main process
    'es2021'           // ECMAScript 2021 features
  ],
  plugins: [
    'promise',             // For async/await and promise best practices
    'security',            // To follow security best practices in Electron
    'marko'                // To lint Marko templates
  ],
  ignorePatterns: ['dist/'], // Ignore the dist directory (webpack built files)
  rules: {
    // General Best Practices
    'no-console': 'off',   // Allow console logs (useful for Electron apps)
    'no-var': 'error',     // Prefer let/const over var
    'prefer-const': 'error', // Suggest const for variables not reassigned
    'promise/always-return': 'warn',
    'promise/no-nesting': 'warn',

    // Security Rules
    'security/detect-object-injection': 'off', // Disable for performance (false positives)
    'security/detect-non-literal-fs-filename': 'warn', // Warn about non-literal file paths

    // Electron-specific Rules
    'no-restricted-globals': [
      'error',
      {
        name: 'window',
        message: 'Use contextBridge APIs instead of direct window access for security.'
      }
    ],
    'no-restricted-properties': [
      'error',
      {
        object: 'ipcRenderer',
        property: 'sendSync',
        message: 'Avoid using synchronous IPC calls, prefer async `invoke/send` methods.'
      }
    ],

    // Marko Linting Rules
    'marko/no-scriptlets': 'warn',    // Avoid scriptlets in Marko templates where possible
    'marko/no-deprecated-tags': 'error', // Prevent usage of deprecated Marko tags

    // Style & Code Formatting
    semi: ['error', 'always'],     // Enforce semicolons (as per NeoStandard)
    quotes: ['error', 'single'],   // Use single quotes for strings
    indent: ['error', 2],          // 2-space indentation for readability
    'eol-last': ['error', 'always'], // Ensure file ends with a newline
    'no-trailing-spaces': 'error'    // No trailing whitespace
  }
})
