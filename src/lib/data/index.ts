import { unstable_getCacheForType } from "react";
import { Fetcher, Resource } from "../../framework/shared/cache";

type ResourceState<T> =
  | { type: "pending"; promise: Promise<unknown> }
  | { type: "resolved"; value: T }
  | { type: "rejected"; error: unknown };

class ClientResource<T> implements Resource<T> {
  #state: ResourceState<T>;

  private constructor(state: ResourceState<T>) {
    this.#state = state;
  }

  static fromPromise<T>(promise: Promise<T>): Resource<T> {
    const resource = new ClientResource<T>({
      type: "pending",
      promise: promise.then(
        (value) => {
          resource.#state = { type: "resolved", value };
        },
        (error) => {
          resource.#state = { type: "rejected", error };
        }
      ),
    });
    return resource;
  }

  read(): T {
    const state = this.#state;
    switch (state.type) {
      case "pending":
        throw state.promise;
      case "resolved":
        return state.value;
      case "rejected":
        throw state.error;
    }
  }
}

const getCache = () => new Map<string, Resource<unknown>>();

export { type Resource } from "../../framework/shared/cache";

export function useDataResource<Key extends string, T>(
  key: Key,
  fetcher: Fetcher<Key, T>
): Resource<T> {
  const cache = unstable_getCacheForType(getCache);
  let resource = cache.get(key) as Resource<T> | undefined;
  if (resource == null) {
    resource = ClientResource.fromPromise(fetcher(key));
    cache.set(key, resource);
  }
  return resource;
}
export function useData<Key extends string, T>(
  key: Key,
  fetcher: Fetcher<Key, T>
): T {
  const resource = useDataResource(key, fetcher);
  return resource.read();
}
