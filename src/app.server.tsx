import { Suspense } from "react";
import { nanoid } from "nanoid";
import { Counter } from "./components/counter.client";
import { Slow } from "./components/slow";
import { Link } from "./lib/link.client";
import { Head } from "./lib/head.client";

export const App = ({ pathname }: { pathname: string }): JSX.Element => {
  const path = `path${Math.floor(Math.random() * 100)}`;
  return (
    <>
      <Head>
        <title>Path: {pathname}</title>
      </Head>
      <h1>Page: {pathname}</h1>
      <Counter />
      <Slow ms={500}>
        <p>Data1</p>
      </Slow>
      <Suspense key={nanoid()} fallback={<p>loading 2000 ms</p>}>
        <Slow ms={2000}>
          <p>Data2</p>
        </Slow>
      </Suspense>
      <p>
        <Link href={`/${path}`}>Go to /{path}</Link>
      </p>
    </>
  );
};
