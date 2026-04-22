// File: jest.config.js
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/prisma/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  forceExit: true
};