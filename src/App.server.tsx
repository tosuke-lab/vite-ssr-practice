import React, { Suspense } from "react";
import { Counter } from "./components/counter.client";
import { Slow } from "./components/slow";

export const App: React.VFC = () => {
  return (
    <div>
      <Suspense fallback={null}>
        <Counter />
      </Suspense>
      <Suspense fallback={<p>loading 1000 ms</p>}>
        <Slow ms={1000} />
      </Suspense>
      <Suspense fallback={<p>loading 1500 ms</p>}>
        <Slow ms={1500} />
      </Suspense>
    </div>
  );
};
