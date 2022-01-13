import ReactDOM from "react-dom";
import { Suspense } from "react";
import { App } from "./App";

const rootEl = document.getElementById("app");
if (rootEl != null) {
  ReactDOM.createRoot(rootEl).render(
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
