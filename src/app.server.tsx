import { createElement } from "react";
import { Head } from "./lib/head.client";
import { Status } from "./lib/status.client";
import { createRouter } from "./lib/router/builder";
import { routes } from "./routes";
import { Location } from "history";

const router = createRouter(routes);

export const App = ({ location }: { location: Location }): JSX.Element => {
  const matchResult = router.match(location);
  if (matchResult) {
    return createElement(matchResult.action.component, matchResult.result);
  }
  return (
    <>
      <Status code={404} />
      <Head>
        <title>NotFound</title>
      </Head>
      <h1>ăȘăă!!!!</h1>
    </>
  );
};
