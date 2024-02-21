/* eslint-disable */
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  displayName: 'caliobase',
  preset: '../../jest.preset.js',
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
  coverageDirectory: '../../coverage/packages/caliobase',
  coverageReporters: [['text', { skipFull: true }]],
  collectCoverageFrom: ['./src/**'],
};

export default config;
