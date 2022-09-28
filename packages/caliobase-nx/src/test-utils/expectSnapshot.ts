import { Tree } from '@nrwl/devkit';

export function expectSnapshot(tree: Tree, path: string) {
  const src = tree.read(path)?.toString();
  expect(src).toBeTruthy();
  expect(src).toMatchSnapshot(path);
}
