import { Suspense, useMemo } from "react";
import { nanoid } from "nanoid";
import { Head } from "../lib/head.client";
import { Counter } from "../components/counter.client";
import { Slow } from "../components/slow";
import { Link } from "../lib/link";
import { routes } from "../routes";

export const RandomPage = ({
  params: { id = "index" },
}: {
  params: { id?: string };
}): JSX.Element => {
  const nextId = useMemo(() => nanoid(), [id]);
  return (
    <>
      <Head>
        <title>Path: {id}</title>
      </Head>
      <h1>Page: {id}</h1>
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
        <Link to={routes.random} params={{ id: nextId }}>
          Go to /path-{nextId}
        </Link>
      </p>
    </>
  );
};
