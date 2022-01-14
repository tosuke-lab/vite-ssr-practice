import React from "react";

export type CacheType = Map<string, Promise<unknown> | { data: unknown }>;

let cache: CacheType;

export function Cache(
  props: React.PropsWithChildren<{ readonly cache?: CacheType }>
) {
  cache =
    props.cache ?? new Map<string, Promise<unknown> | { data: unknown }>();
  return React.createElement(React.Fragment, {}, props.children);
}

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
