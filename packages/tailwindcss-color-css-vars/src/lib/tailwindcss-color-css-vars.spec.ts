import { tailwindcssColorCssVars } from './tailwindcss-color-css-vars';

describe('tailwindcssColorCssVars', () => {
  it('should work', () => {
    expect(tailwindcssColorCssVars()).toEqual('tailwindcss-color-css-vars');
  });
});
