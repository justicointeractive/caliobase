const relationControllerStorage = new Map<
  // eslint-disable-next-line @typescript-eslint/ban-types
  Function,
  { properties: (string | symbol)[] }
>();

export function RelationController(): PropertyDecorator {
  return (target, key) => {
    const targetStorage = relationControllerStorage.get(target.constructor) ?? {
      properties: [],
    };
    relationControllerStorage.set(target.constructor, targetStorage);
    targetStorage.properties.push(key);
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getRelationController(target: Function) {
  return relationControllerStorage.get(target);
}
