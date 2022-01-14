import React, { Suspense } from "react";
import { Slow } from "./components/slow";
import { Cache } from "./lib/useData";

const Lazy = React.lazy(() => import("./components/lazy"));

export const App: React.VFC = () => (
  <Cache>
    <div>
      <p>Hello World!</p>
      <Lazy />
      <Suspense fallback="loading...">
        <Slow />
      </Suspense>
    </div>
  </Cache>
);
