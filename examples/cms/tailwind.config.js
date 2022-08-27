const path = require('path');
const { colorVars } = require('../../dist/packages/tailwindcss-color-css-vars');
const { createGlobPatternsForDependencies } = require('@nrwl/react/tailwind');

const caliobaseUiDir = path.resolve(
  require.resolve('../../dist/packages/caliobase-ui'),
  '..'
);

module.exports = {
  content: [
    `${caliobaseUiDir}/**/*.js`,
    ...createGlobPatternsForDependencies(__dirname),
  ],
  plugins: [colorVars],
};
