import { createContext } from "react";

export interface Resource<T> {
  read(): T;
}

export type Fetcher<Key extends string, T> = (key: Key) => Promise<T>;

export interface Cache {
  getForKey<Key extends string, T>(
    key: Key,
    fetcher: Fetcher<Key, T>
  ): Resource<T>;
}

export const CacheContext = createContext<Cache | undefined>(undefined);
if (!import.meta.env.PROD) {
  CacheContext.displayName = "CacheContext";
}
