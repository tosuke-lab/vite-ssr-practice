import type { Resource, Cache, Fetcher } from "../shared/cache";

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
      promise: promise
        .then((value) => {
          resource.#state = { type: "resolved", value };
        })
        .catch((error) => {
          resource.#state = { type: "rejected", error };
        }),
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

export class ClientCache implements Cache {
  private resources = new Map<string, Resource<unknown>>();
  private pendingByServer = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: unknown) => void }
  >();

  getForKey<Key extends string, T>(
    key: Key,
    fetcher: Fetcher<Key, T>
  ): Resource<T> {
    const cachedResource = this.resources.get(key);
    if (cachedResource != null) return cachedResource as Resource<T>;

    const resource = ClientResource.fromPromise(fetcher(key));
    this.resources.set(key, resource);
    return resource;
  }

  resolveServerCache(data: unknown) {
    if (!isRecord(data)) return;
    for (const [key, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;
      switch (value[0]) {
        // pending
        case "P":
          this.resources.set(
            key,
            ClientResource.fromPromise(
              new Promise((resolve, reject) => {
                this.pendingByServer.set(key, { resolve, reject });
              })
            )
          );
          break;
        // resolve
        case "R":
          this.pendingByServer.get(key)?.resolve(value[1]);
          break;
        // reject
        case "E": {
          const message = value[1]?.message ?? "";
          const stack = value[1]?.stack ?? "";
          if (typeof message !== "string" || typeof stack !== "string") break;
          const error = new Error(message);
          error.stack = stack;
          this.pendingByServer.get(key)?.reject(error);
          break;
        }
      }
    }
  }
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object";
}
