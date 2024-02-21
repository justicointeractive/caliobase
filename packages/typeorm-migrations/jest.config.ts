/* eslint-disable */
export default {
  displayName: 'typeorm-migrations',
  preset: '../../jest.preset.js',
  globals: {},
  testTimeout: 30_000,
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/typeorm-migrations',
};
