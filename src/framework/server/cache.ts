import type { Resource, Cache, Fetcher } from "../shared/cache";

type ResourceState<T> =
  | { type: "pending"; promise: Promise<unknown> }
  | { type: "resolved"; value: T }
  | { type: "rejected"; error: unknown };

export class ServerCache implements Cache {
  private resources = new Map<string, Resource<unknown>>();
  private changedStates = new Map<string, ResourceState<unknown>>();

  getForKey<Key extends string, T>(
    key: Key,
    fetcher: Fetcher<Key, T>
  ): Resource<T> {
    const cachedResource = this.resources.get(key);
    if (cachedResource != null) return cachedResource as Resource<T>;

    const changedStates = this.changedStates;

    class ServerResource<U> implements Resource<U> {
      constructor(
        private key: string,
        public state: ResourceState<U>,
        private previousState: ResourceState<U> | undefined
      ) {}

      read(): U {
        // Suspense boundaryが開いたタイミングでキャッシュにstate変化を通知したいので，render phaseで呼ばれるreadでこれを行う
        // promiseが解決したタイミングで任意に変化を通知してしまうと，異常な位置に<script>タグが生成されてしまう
        if (this.previousState !== this.state) {
          this.previousState = this.state;
          changedStates.set(this.key, this.state);
        }
        switch (this.state.type) {
          case "pending":
            throw this.state.promise;
          case "resolved":
            return this.state.value;
          case "rejected":
            throw this.state.error;
        }
      }
    }

    const promise = fetcher(key);
    const resource = new ServerResource<T>(
      key,
      {
        type: "pending",
        promise: promise
          .then((value) => {
            resource.state = { type: "resolved", value };
          })
          .catch((error) => {
            resource.state = { type: "rejected", error };
          }),
      },
      undefined
    );
    this.resources.set(key, resource);
    return resource;
  }

  hasChanges(): boolean {
    return this.changedStates.size > 0;
  }

  flushChangedState(): unknown {
    const result: Record<string, unknown> = {};
    for (const [key, state] of this.changedStates.entries()) {
      result[key] = serializeState(state);
    }
    this.changedStates.clear();
    return result;
  }
}

function serializeState(state: ResourceState<unknown>): unknown {
  switch (state.type) {
    case "pending":
      return ["P"];
    case "resolved":
      return ["R", state.value];
    case "rejected": {
      const error = state.error;
      let message: string;
      let stack = "";
      try {
        if (error instanceof Error) {
          message = String(error.message);
          stack = String(error.stack);
        } else {
          message = `Error: ${error}`;
        }
      } catch {
        message = "An error occurred while serializing the error message.";
      }
      return ["E", { message, stack }];
    }
  }
}
