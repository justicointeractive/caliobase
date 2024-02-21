import { readProjectConfiguration, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { expectDependenciesMatch } from '../../test-utils/expectDependenciesMatch';
import { expectSnapshot } from '../../test-utils/expectSnapshot';

import generator from './generator';
import { ApiGeneratorSchema } from './schema';

describe('api generator', () => {
  let appTree: Tree;
  const options: ApiGeneratorSchema = { name: 'api' };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'api');
    expect(config).toBeDefined();

    expectSnapshot(appTree, 'package.json', [
      [/"@caliobase\/caliobase": "[0-9.]+"/g, '"@caliobase/caliobase": "*"'],
    ]);
    await expectDependenciesMatch(appTree, 'package.json');
    expectSnapshot(appTree, 'apps/api/project.json');
    expectSnapshot(appTree, 'apps/api/src/main.ts');
    expectSnapshot(appTree, 'apps/api/src/app/app.module.ts');
    expectSnapshot(
      appTree,
      'apps/api/src/app/entities/organization-profile.entity.ts'
    );
    expectSnapshot(appTree, 'apps/api/src/app/entities/user-profile.entity.ts');
  });
});
