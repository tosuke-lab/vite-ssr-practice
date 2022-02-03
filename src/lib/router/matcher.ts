import type { ParseUrlParams } from "typed-url-params";
import { compile, match, MatchFunction, PathFunction } from "path-to-regexp";

export interface RouteContext {
  path: string;
  search: string;
  searchParams?: URLSearchParams;
}

export interface MatchResult<TParams, TQuery> {
  params: TParams;
  query: TQuery;
}

export interface Action<TResult extends MatchResult<any, any>> {
  component: React.ComponentType<TResult>;
}

export type InferProps<TBuilder extends RouteBuilder<MatchResult<any, any>>> =
  TBuilder extends RouteBuilder<infer TResult> ? TResult : never;

abstract class RouteMatcher<TResult extends MatchResult<any, any>> {
  abstract match(context: RouteContext): TResult | undefined;
  abstract reconstruct(result: TResult): RouteContext;

  buildLink(result: TResult) {
    const ctx = this.reconstruct(result);
    return `${ctx.path}${ctx.search}`;
  }

  action(action: Action<TResult>): RouteBuilder<TResult> {
    return new RouteBuilder(this, action);
  }
}

class RouteBuilder<
  TResult extends MatchResult<any, any>
> extends RouteMatcher<TResult> {
  constructor(
    private _matcher: RouteMatcher<TResult>,
    private _action: Action<TResult>
  ) {
    super();
  }

  match(context: RouteContext): TResult | undefined {
    return this._matcher.match(context);
  }
  reconstruct(result: TResult): RouteContext {
    return this._matcher.reconstruct(result);
  }

  getAction() {
    return this._action;
  }
}

export { type RouteBuilder };

class PathMatcher<Path extends string> extends RouteMatcher<
  MatchResult<ParseUrlParams<Path>, unknown>
> {
  private _match: MatchFunction<object>;
  private _toPath: PathFunction<object>;

  constructor(path: Path) {
    super();
    this._match = match(path, { decode: decodeURIComponent });
    this._toPath = compile(path, { encode: encodeURIComponent });
  }
  match(context: RouteContext) {
    const result = this._match(context.path);
    if (result === false) return;
    return {
      params: result.params as ParseUrlParams<Path>,
      query: {},
    };
  }
  reconstruct(result: MatchResult<ParseUrlParams<Path>, unknown>) {
    return {
      path: this._toPath(result.params),
      search: "",
    };
  }
}

export function routeOf<Path extends string>(
  path: Path
): RouteMatcher<MatchResult<ParseUrlParams<Path>, unknown>> {
  return new PathMatcher<Path>(path);
}
