const path = require('path');
const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');

const caliobaseUiDir = path.resolve(
  require.resolve('../../dist/packages/caliobase-ui'),
  '..'
);

module.exports = {
  content: [
    `${caliobaseUiDir}/**/*.js`,
    ...createGlobPatternsForDependencies(__dirname),
  ],
  plugins: [],
};
