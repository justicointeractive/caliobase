import plugin from 'tailwindcss/plugin';

type ThemeColors = Record<string, string | Record<string, string>>;

const flattenColorPalette = (colors: ThemeColors): Record<string, string> =>
  Object.assign(
    {},
    ...Object.entries(colors ?? {}).flatMap(([color, values]) =>
      typeof values == 'object'
        ? Object.entries(flattenColorPalette(values)).map(([number, hex]) => ({
            [color + (number === 'DEFAULT' ? '' : `-${number}`)]: hex,
          }))
        : [{ [`${color}`]: values }]
    )
  );

export const colorVars = plugin(function ({ matchUtilities, theme }) {
  const colors = flattenColorPalette(theme('fill'));

  matchUtilities(
    {
      'color-var': (value: string) => {
        const [variable, colorRef] = value.split(' ');

        return {
          [`--${variable}`]: `${colors[colorRef]}`,
        };
      },
    },
    { type: ['any'] }
  );
});
