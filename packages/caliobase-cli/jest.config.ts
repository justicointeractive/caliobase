/* eslint-disable */
export default {
  displayName: 'caliobase-cli',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['babel-jest', { presets: ['@nx/js/babel'] }],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/packages/caliobase-cli',
};
