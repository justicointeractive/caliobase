import {
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  Tree,
} from '@nrwl/devkit';
import { applicationGenerator } from '@nrwl/nest/src/generators/application/application';
import * as path from 'path';
import { ApiGeneratorSchema } from './schema';

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

export default async function (tree: Tree, options: ApiGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  await applicationGenerator(tree, { name: options.name });
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    normalizedOptions.projectRoot,
    {
      cmsProjectName: null,
      ...options,
      ...normalizedOptions,
      tmpl: '',
    }
  );
  await formatFiles(tree);
}
