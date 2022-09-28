/* eslint-disable */
export default {
  displayName: 'caliobase-nx',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  testTimeout: 30_000,
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@nrwl/webpack)/)'],
  moduleFileExtensions: ['ts', 'js', 'html', 'd.ts'],
  coverageDirectory: '../../coverage/packages/caliobase-nx',
};
