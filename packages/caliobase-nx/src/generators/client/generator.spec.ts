import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { expectSnapshot } from '../../test-utils/expectSnapshot';
import apiGenerator from '../api/generator';
import generator from './generator';
import { ClientGeneratorSchema } from './schema';

describe('client generator', () => {
  let appTree: Tree;
  const options: ClientGeneratorSchema = {
    name: 'client',
    apiProjectName: 'api',
  };

  beforeEach(async () => {
    appTree = createTreeWithEmptyWorkspace();
    await apiGenerator(appTree, { name: 'api' });
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'client');
    expect(config).toBeDefined();
    expectSnapshot(appTree, 'package.json', [
      [/"@caliobase\/caliobase": "[0-9.]+"/g, '"@caliobase/caliobase": "*"'],
    ]);
    expectSnapshot(appTree, 'apps/api/src/main.ts');
    expectSnapshot(appTree, 'libs/client/project.json');
    expectSnapshot(appTree, 'libs/client/src/index.ts');
    expectSnapshot(appTree, 'libs/client/src/lib/client.ts');
  });
});
