// jest.config.js
module.exports = {
    testEnvironment: 'node', // 或 'jsdom'，根据你的项目需求
    preset: 'ts-jest',
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    transformIgnorePatterns: [
        '/node_modules/',
      ],
    testRegex: '(/src/.*|(\\.|/)(test|))\\.test\\.ts?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
