import {
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';

export function modifyProjectConfiguration(
  tree: Tree,
  projectName: string,
  action: (config: ProjectConfiguration) => ProjectConfiguration
) {
  let config = readProjectConfiguration(tree, projectName);
  config = action(config);
  updateProjectConfiguration(tree, projectName, config);
}
