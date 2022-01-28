import React from "react";

declare module "react" {
  export interface CacheProps {}

  export const unstable_Cache: React.ExoticComponent<CacheProps>;

  export interface CacheRefreshFunction {
    (): void;
  }

  export function unstable_useCacheRefresh(): CacheRefreshFunction;

  export function unstable_getCacheForType<T>(resourceType: () => T): T;
}
