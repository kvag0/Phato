export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/tests/**/*.js',
    '**/__tests__/**/*.js', 
    '**/?(*.)+(spec|test).js'
  ],
  testTimeout: 600000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};