import "./framework/client/webpack-chunk-loader-polyfill.js";
import React, {
  useEffect,
  unstable_useCacheRefresh as useCacheRefresh,
  startTransition,
} from "react";
import ReactDOM from "react-dom";
import browserHistory from "history/browser";
import { FlightApp } from "./framework/client/rsc";
import { HistoryContext } from "./framework/shared/router.js";
import { HelmetProvider } from "react-helmet-async";
import { App as ServerApp } from "./app.server";

const HMRUpdator: React.VFC = import.meta.env.DEV
  ? () => {
      const refresh = useCacheRefresh();

      useEffect(() => {
        startTransition(() => {
          refresh();
        });
      }, [ServerApp]);

      return null;
    }
  : () => null;
if (import.meta.env.DEV) {
  HMRUpdator.displayName = "HMRUpdator";
}

if (import.meta.hot) {
  import.meta.hot.accept();
}

const App = (): JSX.Element => (
  <HelmetProvider>
    <HistoryContext.Provider value={browserHistory}>
      <FlightApp />
      {import.meta.env.DEV && <HMRUpdator />}
    </HistoryContext.Provider>
  </HelmetProvider>
);

let reactRoot: ReactDOM.Root | undefined;
if (import.meta.hot) {
  reactRoot = import.meta.hot.data.reactRoot;
}

const rootEl = document.getElementById("app");

if (rootEl != null && reactRoot == null) {
  reactRoot = ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (import.meta.hot) {
  import.meta.hot.data.reactRoot = reactRoot;
}
