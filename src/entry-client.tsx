import "./framework/shared/webpack-chunk-loader-polyfill.js";
import React from "react";
import ReactDOM from "react-dom";
import { ClientCache } from "./framework/client/cache";
import { CacheContext } from "./framework/shared/cache";
import { FlightApp } from "./framework/client/rsc";

const cache = new ClientCache();

// サーバー側でのキャッシュ変化を受け取り，クライアント側に反映させる
((window as any).__cache ??= []).forEach((value: unknown) =>
  cache.resolveServerCache(value)
);
(window as any).__cache.push = (value: unknown) =>
  cache.resolveServerCache(value);

let reactRoot: ReactDOM.Root;
const rootEl = document.getElementById("app");

if (rootEl != null) {
  reactRoot = ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <CacheContext.Provider value={cache}>
        <FlightApp />
      </CacheContext.Provider>
    </React.StrictMode>
  );
}
