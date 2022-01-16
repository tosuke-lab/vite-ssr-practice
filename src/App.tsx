import React, { Suspense } from "react";
import { Counter } from "./components/counter";
import { Slow } from "./components/slow";

const Lazy = React.lazy(() => import("./components/lazy"));

export const App: React.VFC = () => {
  return (
    <div>
      <p>Hello World!</p>
      <Counter />
      {/* FIXME: lazy component が client side ではトップレベルで動作しない */}
      {/*<Lazy />*/}
      <Suspense fallback="loading...">
        <Slow />
      </Suspense>
    </div>
  );
};
