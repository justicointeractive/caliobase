import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { expectSnapshot } from '../../test-utils/expectSnapshot';

import generator from './generator';
import { ApiGeneratorSchema } from './schema';

describe('api generator', () => {
  let appTree: Tree;
  const options: ApiGeneratorSchema = { name: 'api' };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'api');
    expect(config).toBeDefined();

    expectSnapshot(appTree, 'apps/api/src/main.ts');
    expectSnapshot(appTree, 'apps/api/src/app/app.module.ts');
    expectSnapshot(
      appTree,
      'apps/api/src/app/entities/organization-profile.entity.ts'
    );
    expectSnapshot(appTree, 'apps/api/src/app/entities/user-profile.entity.ts');
  });
});
