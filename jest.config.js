module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFiles: ['<rootDir>/jest.setup.js'],
    clearMocks: true,
    restoreMocks: true,
    // Every component is listed, tested or not, so untested ones show up at 0%
    // in `npm run coverage:component-report` instead of disappearing.
    collectCoverageFrom: [
        'src/components/**/*.js',
        'src/middleware/**/*.js',
        '!src/components/**/__tests__/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text-summary', 'lcov', 'json-summary']
};
