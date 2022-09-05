# tailwindcss-color-css-vars

This Tailwind CSS plugin allows you to set CSS variables with arbitrary names with values from the theme palette.

## Deprecation Notice

You probably should not use this plugin anymore. Similar functionality is built into Tailwind CSS now using arbitrary properties and theme functions.

```tsx
<div className="[--brand-text:theme(colors.red.500)]">
  <span className="text-[color:var(--brand-text)]">Brand</span>
</div>
```

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
