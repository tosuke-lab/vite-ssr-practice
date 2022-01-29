const importMap = __IMPORT_MAP__;
const importPrefix = __IMPORT_PREFIX__;

globalThis.__webpack_chunk_load__ = (chunkId) => {
  return Promise.resolve(importMap[importPrefix + chunkId]);
};

globalThis.__webpack_require__ = (id) => {
  return importMap[importPrefix + id];
};
