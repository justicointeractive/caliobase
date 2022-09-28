import {
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  Tree,
} from '@nrwl/devkit';
import { applicationGenerator } from '@nrwl/nest/src/generators/application/application';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import * as path from 'path';
import { modifyProjectConfiguration } from '../../lib/modifyProjectConfiguration';
import { addDependencyVersionsToPackageJson } from '../../lib/versions';
import { ApiGeneratorSchema } from './schema';
import assert = require('assert');

interface NormalizedSchema extends ApiGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: ApiGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
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
    cmsProjectName: null,
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

export default async function (tree: Tree, options: ApiGeneratorSchema) {
  const tasks: GeneratorCallback[] = [];

  const normalizedOptions = normalizeOptions(tree, options);

  await applicationGenerator(tree, { name: options.name });

  addFiles(tree, normalizedOptions);

  modifyProjectConfiguration(tree, options.name, (config) => {
    assert(config.targets);
    config.targets['build'].options['tsPlugins'] = ['@nestjs/swagger/plugin'];
    return config;
  });

  tasks.push(
    addDependencyVersionsToPackageJson(tree, [
      'nodemailer',
      '@caliobase/caliobase',
      '@nestjs/swagger',
    ])
  );

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}
