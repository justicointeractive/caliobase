# caliobase-ui

This library was generated with [Nx](https://nx.dev).

## Mounting the UI below a subdirectory

`CaliobaseUI` is root-hosted by default. If the CMS is served below a path such as `/cms`, pass `uiBasePath` when building the configuration so React Router generates and matches links under that mount point:

```ts
const appConfig = new CaliobaseUiConfigurationBuilder(Api, {
  baseUrl: '',
  frontEndBaseUrl: '',
  preferredLoginMethod: 'password',
  uiBasePath: '/cms',
}).build();
```

The option accepts `cms`, `/cms`, or `/cms/` and normalizes them to `/cms`. Apps still need their bundler/static host configured to serve built assets from the same subdirectory.

## Declaring custom Editor.js block tools

`EditorJsValueEditor` includes Caliobase's built-in `header`, `list`, `image`, and `attaches` tools. Host applications can add site-specific Editor.js block tools through the field `editorOptions.tools` map; the map is merged into the default tools before Editor.js starts.

```tsx
const publicPageBlocks = {
  'site/hero': SiteHeroEditorTool,
  'site/cardGrid': SiteCardGridEditorTool,
};

builder.addEntity('page', {
  fields: [
    {
      label: 'Content',
      property: 'blocks',
      defaultValue: () => ({ blocks: [] }),
      editor: EditorJsValueEditor,
      editorOptions: {
        placeholder: 'Write page content',
        tools: publicPageBlocks,
      },
    },
  ],
});
```

If a host declares a key that matches a built-in tool, the host tool intentionally overrides the default. `defaultBlock`, `inlineToolbar`, `tunes`, and `i18n` can also be passed through `editorOptions` for custom tool configuration.

## Running unit tests

Run `nx test caliobase-ui` to execute the unit tests via [Jest](https://jestjs.io).
