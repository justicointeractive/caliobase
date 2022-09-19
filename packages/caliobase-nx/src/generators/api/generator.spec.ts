import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import generator from './generator';
import { ApiGeneratorSchema } from './schema';

describe('api generator', () => {
  let appTree: Tree;
  const options: ApiGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();

    expectSnapshot(appTree, 'apps/test/src/main.ts');
    expectSnapshot(appTree, 'apps/test/src/app/app.module.ts');
    expectSnapshot(
      appTree,
      'apps/test/src/app/entities/organization-profile.entity.ts'
    );
    expectSnapshot(
      appTree,
      'apps/test/src/app/entities/user-profile.entity.ts'
    );
  });
});

function expectSnapshot(tree: Tree, path: string) {
  expect(tree.read(path)?.toString()).toMatchSnapshot(path);
}
