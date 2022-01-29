import "./framework/client/webpack-chunk-loader-polyfill.js";
import React from "react";
import ReactDOM from "react-dom";
import browserHistory from "history/browser";
import { FlightApp } from "./framework/client/rsc";
import { HistoryContext } from "./framework/shared/router.js";
import { HelmetProvider } from "react-helmet-async";

let reactRoot: ReactDOM.Root;
const rootEl = document.getElementById("app");

if (rootEl != null) {
  reactRoot = ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <HelmetProvider>
        <HistoryContext.Provider value={browserHistory}>
          <FlightApp />
        </HistoryContext.Provider>
      </HelmetProvider>
    </React.StrictMode>
  );
}
