import {
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  Tree,
} from '@nx/devkit';
import { libraryGenerator } from '@nx/js/src/generators/library/library';
import * as path from 'path';
import { modifyProjectConfiguration } from '../../lib/modifyProjectConfiguration';
import { ClientGeneratorSchema } from './schema';

interface NormalizedSchema extends ClientGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: ClientGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    tmpl: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export default async function (tree: Tree, options: ClientGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  await libraryGenerator(tree, {
    name: options.name,
    directory: options.directory,
    skipFormat: true,
  });
  addFiles(tree, normalizedOptions);
  modifyProjectConfiguration(tree, options.name, (config) => {
    config.targets = {
      ...config.targets,
      'generate-sources': {
        executor: '@caliobase/caliobase-nx:swagger-client',
        outputs: [`${normalizedOptions.projectRoot}/src`],
        options: {
          input: `./${normalizedOptions.projectRoot}/assets/openapi.json`,
          output: `./${normalizedOptions.projectRoot}/src/lib`,
          name: `${normalizedOptions.projectName}.ts`,
        },
        dependsOn: [{ projects: 'dependencies', target: 'swagger' }],
      },
    };
    config.implicitDependencies = [
      ...(config.implicitDependencies ?? []),
      options.apiProjectName,
    ];

    return config;
  });
  modifyProjectConfiguration(
    tree,
    options.apiProjectName,
    (apiProjectConfig) => {
      apiProjectConfig.targets = {
        ...apiProjectConfig.targets,
        swagger: {
          executor: 'nx:run-commands',
          outputs: [`${normalizedOptions.projectRoot}/assets`],
          dependsOn: [
            {
              target: 'build',
              projects: 'self',
            },
          ],
          options: {
            command: `node ./dist/${apiProjectConfig.root}/main.js --write-swagger-and-exit=./${normalizedOptions.projectRoot}/assets/openapi.json`,
          },
        },
      };

      return apiProjectConfig;
    }
  );

  // TODO: update nx.json's targetDefaults build dependsOn "^generate-sources", "generate-sources"

  await formatFiles(tree);
}
