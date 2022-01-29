import "./framework/shared/webpack-chunk-loader-polyfill.js";
import React from "react";
import ReactDOM from "react-dom";
import browserHistory from "history/browser";
import { FlightApp } from "./framework/client/rsc";
import { HistoryContext } from "./framework/shared/router.js";

let reactRoot: ReactDOM.Root;
const rootEl = document.getElementById("app");

if (rootEl != null) {
  reactRoot = ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <HistoryContext.Provider value={browserHistory}>
        <FlightApp />
      </HistoryContext.Provider>
    </React.StrictMode>
  );
}
