import React from "react";
import ReactDOM from "react-dom";
import { ClientCache } from "./framework/client/cache";
import { App } from "./App";
import { CacheContext } from "./framework/shared/cache";

const cache = new ClientCache();

// サーバー側でのキャッシュ変化を受け取り，クライアント側に反映させる
((self as any).__cache ??= []).forEach((value: unknown) =>
  cache.resolveServerCache(value)
);
(self as any).__cache.push = (value: unknown) =>
  cache.resolveServerCache(value);

let reactRoot: ReactDOM.Root;
const rootEl = document.getElementById("app");

if (rootEl != null) {
  reactRoot = ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <CacheContext.Provider value={cache}>
        <App />
      </CacheContext.Provider>
    </React.StrictMode>
  );
}
