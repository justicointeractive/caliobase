# tailwindcss-color-css-vars

This Tailwind CSS plugin allows you to set CSS variables with arbitrary names with values from the theme palette.

## Example

```tsx
<div className="color-var-[brand-text_red-500]">
  <span className="text-[color:var(--brand-text)]">Brand</span>
</div>
```

## Installation

Add this plugin to your tailwind.config.js

```javascript
const { colorVars } = require('tailwindcss-color-css-vars');

module.exports = {
  content: [
    ...
  ],
  plugins: [colorVars],
};

```

---

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build tailwindcss-color-css-vars` to build the library.

## Running unit tests

Run `nx test tailwindcss-color-css-vars` to execute the unit tests via [Jest](https://jestjs.io).
