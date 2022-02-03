import { routeOf } from "./lib/router/matcher";
import { RandomPage } from "./pages/random.server";

export const routes = {
  index: routeOf("/").action({ component: RandomPage }),
  random: routeOf("/path-:id").action({ component: RandomPage }),
};
