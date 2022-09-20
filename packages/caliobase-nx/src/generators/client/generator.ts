import {
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/js/src/generators/library/library';
import * as path from 'path';
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
  await libraryGenerator(tree, { name: options.name, skipFormat: true });
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

  await formatFiles(tree);
}

function modifyProjectConfiguration(
  tree: Tree,
  projectName: string,
  action: (config: ProjectConfiguration) => ProjectConfiguration
) {
  let config = readProjectConfiguration(tree, projectName);
  config = action(config);
  updateProjectConfiguration(tree, projectName, config);
}
