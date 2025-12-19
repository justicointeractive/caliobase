import {
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';
import { Linter } from '@nx/eslint';
import { applicationGenerator } from '@nx/react';
import * as path from 'path';
import { modifyProjectConfiguration } from '../../lib/modifyProjectConfiguration';
import { addDependencyVersionsToPackageJson } from '../../lib/versions';
import { UiGeneratorSchema } from './schema';
import assert = require('assert');

interface NormalizedSchema extends UiGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: UiGeneratorSchema
): NormalizedSchema {
  const name = names(options.name!).fileName;
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
    ...options,
    ...names(options.name!),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export default async function (tree: Tree, options: UiGeneratorSchema) {
  const tasks: GeneratorCallback[] = [];
  const normalizedOptions = normalizeOptions(tree, options);
  await applicationGenerator(tree, {
    name: normalizedOptions.projectName,
    directory: normalizedOptions.projectRoot,
    projectNameAndRootFormat: 'as-provided',
    e2eTestRunner: 'cypress',
    linter: Linter.EsLint,
    unitTestRunner: 'jest',
    skipFormat: true,
    style: 'css',
  });
  addFiles(tree, normalizedOptions);
  modifyProjectConfiguration(tree, normalizedOptions.projectName, (config) => {
    assert(config.targets);
    config.targets['serve'].options[
      'proxyConfig'
    ] = `${normalizedOptions.projectRoot}/proxy.conf.json`;
    return config;
  });
  await formatFiles(tree);

  tasks.push(
    addDependencyVersionsToPackageJson(tree, ['@caliobase/caliobase-ui'])
  );

  return runTasksInSerial(...tasks);
}
