import React, { useMemo } from "react";
import type { MatchResult, RouteBuilder } from "../router/matcher";
import { UnsafeLink } from "./unsafe-link.client";

type ParamsProps<TParams> = unknown extends TParams
  ? { params?: TParams }
  : { params: TParams };
type QueryProps<TQuery> = unknown extends TQuery
  ? { query?: TQuery }
  : { query: TQuery };

export const Link = <TParams, TQuery>({
  children,
  to,
  params,
  query,
}: React.PropsWithChildren<
  {
    to: RouteBuilder<MatchResult<TParams, TQuery>>;
  } & ParamsProps<TParams> &
    QueryProps<TQuery>
>): JSX.Element => {
  const href = useMemo(
    () =>
      to.buildLink({
        params: params ?? ({} as TParams),
        query: query ?? ({} as TQuery),
      }),
    [to, params, query]
  );

  return <UnsafeLink href={href}>{children}</UnsafeLink>;
};

export { UnsafeLink } from "./unsafe-link.client";
