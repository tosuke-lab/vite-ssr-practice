import { useContext } from "react";
import { Fetcher, CacheContext } from "../../framework/shared/cache";

export function useData<Key extends string, T>(
  key: Key,
  fetcher: Fetcher<Key, T>
): T {
  const cache = useContext(CacheContext);
  if (cache == null) {
    throw new Error("failed to read cache from context");
  }

  return cache.getForKey(key, fetcher).read();
}
