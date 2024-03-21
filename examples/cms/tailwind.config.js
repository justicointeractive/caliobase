const path = require('path');
const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');

const caliobaseUiDir = path.resolve(__dirname, '../../packages/caliobase-ui');

module.exports = {
  content: [
    `${caliobaseUiDir}/**/*.(ts|tsx)`,
    ...createGlobPatternsForDependencies(__dirname),
  ],
  plugins: [],
};
