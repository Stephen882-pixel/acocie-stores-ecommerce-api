module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFiles: ['<rootDir>/jest.setup.js'],
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: [
        'src/components/**/*.js',
        'src/middleware/**/*.js',
        '!src/components/**/__tests__/**'
    ]
};
