import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  displayName: 'example',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx'],
  coverageDirectory: '../../coverage/examples/example',
  coverageReporters: [['text', { skipFull: true }]],
  collectCoverageFrom: ['./src/**'],
};

export default config;
