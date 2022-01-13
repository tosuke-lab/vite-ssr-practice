const cache = new Map<string, Promise<unknown> | { data: unknown }>();

/**
 * Contextを使わないuseSWRの代替
 */
export function useData<V>(
  key: string,
  fetcher: (key: string) => Promise<V>
): V {
  const value = cache.get(key);
  if (value instanceof Promise) {
    throw value;
  }
  if (value == null) {
    const promise = fetcher(key).then((data) => {
      cache.set(key, { data });
    });
    cache.set(key, promise);
    throw promise;
  }
  return value.data as V;
}
