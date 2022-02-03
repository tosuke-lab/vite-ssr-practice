import { Location } from "history";
import { RouteContext, MatchResult, RouteBuilder } from "./matcher";

type Routes = {
  [key: string]: RouteBuilder<MatchResult<any, any>>;
};

export function createRouter<TRoutes extends Routes>(routes: Routes) {
  return {
    match(location: Location) {
      const ctx: RouteContext = {
        path: location.pathname,
        search: location.search,
        searchParams: new URLSearchParams(location.search),
      };
      for (const builder of Object.values(routes)) {
        const result = builder.match(ctx);
        if (result) {
          return {
            result,
            action: builder.getAction(),
          };
        }
      }
    },
  };
}
