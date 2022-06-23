// eslint-disable-next-line @typescript-eslint/ban-types
export function cloneMetadata(source: Object, dest: Object) {
  Reflect.getMetadataKeys(source).forEach((key) => {
    const value = Reflect.getMetadata(key, source);
    Reflect.defineMetadata(key, value, dest);
  });
}
