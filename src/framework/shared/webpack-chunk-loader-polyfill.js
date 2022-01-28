const moduleMap = new Map();

const importMap = __IMPORT_MAP__;
const importPrefix = __IMPORT_PREFIX__;

globalThis.__webpack_chunk_load__ = (chunkId) => {
  const module = moduleMap.get(chunkId);
  if (module != null) {
    return Promise.resolve(module);
  }
  const path = importPrefix + chunkId;
  const promise = importMap[path]();
  promise.then((mod) => {
    moduleMap.set(chunkId, mod);
  });
  return promise;
};

globalThis.__webpack_require__ = (id) => {
  return moduleMap.get(id);
};
