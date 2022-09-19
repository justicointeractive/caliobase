import { Tree } from '@nrwl/devkit';

export function expectSnapshot(tree: Tree, path: string) {
  expect(tree.read(path)?.toString()).toMatchSnapshot(path);
}
