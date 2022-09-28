import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { expectSnapshot } from '../../test-utils/expectSnapshot';
import generator from './generator';
import { UiGeneratorSchema } from './schema';

describe('ui generator', () => {
  let appTree: Tree;
  const options: UiGeneratorSchema = {
    name: 'ui',
  };

  beforeEach(async () => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'ui');
    expect(config).toBeDefined();
    expectSnapshot(appTree, 'package.json');
    expectSnapshot(appTree, 'apps/ui/project.json');
    expectSnapshot(appTree, 'apps/ui/src/main.tsx');
    expectSnapshot(appTree, 'apps/ui/src/styles.css');
  });
});
