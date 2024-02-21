import { Tree } from '@nx/devkit';

export function expectSnapshot(
  tree: Tree,
  path: string,
  replacers: [RegExp, string][] = []
) {
  let src = tree.read(path)?.toString();
  for (const [exp, replacement] of replacers) {
    src = src?.replace(exp, replacement);
  }

  expect(src).toBeTruthy();
  expect(src).toMatchSnapshot(path);
}
