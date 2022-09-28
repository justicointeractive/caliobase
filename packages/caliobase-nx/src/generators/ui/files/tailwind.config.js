const { createGlobPatternsForDependencies } = require('@nrwl/react/tailwind');
const path = require('path');
const caliobaseUiDir = path.resolve(
  require.resolve('@caliobase/caliobase-ui'),
  '..'
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    ...createGlobPatternsForDependencies(__dirname),
    __dirname + '/**/!(*.stories|*.spec|*.generated).{tsx,jsx,js,html}',
    `${caliobaseUiDir}/**/*.js`,
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
