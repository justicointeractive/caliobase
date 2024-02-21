/* eslint-disable */
export default {
  displayName: 'caliobase-nx',
  preset: '../../jest.preset.js',
  globals: {},
  testTimeout: 30_000,
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@nx/webpack)/)'],
  moduleFileExtensions: ['ts', 'js', 'html', 'd.ts'],
  coverageDirectory: '../../coverage/packages/caliobase-nx',
};
