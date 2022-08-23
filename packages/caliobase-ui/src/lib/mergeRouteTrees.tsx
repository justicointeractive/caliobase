import { RouteObject } from 'react-router-dom';

export function mergeRouteTrees(...trees: RouteObject[][]) {
  const root: { children: RouteObject[] } = { children: [] };

  for (const routes of trees) {
    mergeIntoRecursive(root, { children: routes });
  }

  return root.children;
}

function mergeIntoRecursive(
  dest: { children?: RouteObject[] },
  src: { children?: RouteObject[] }
) {
  for (const sourceChild of src.children ?? []) {
    dest.children = dest.children ?? [];
    let destChild = dest.children.find((r) => r.path === sourceChild.path);
    if (destChild == null) {
      destChild = sourceChild;
      dest.children.push(destChild);
    } else {
      if (sourceChild.element) {
        destChild.element = sourceChild.element;
      }
      mergeIntoRecursive(destChild, sourceChild);
    }
  }
}
