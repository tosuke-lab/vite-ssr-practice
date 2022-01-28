declare module "react-server-dom-webpack" {
  import React from "react";

  export interface FlightResponse {
    readRoot(): React.ReactElement;
  }

  export function createFromReadableStream(
    readableStream: ReadableStream
  ): FlightResponse;
  export function createFromFetch(
    promiseForResponse: Promise<Response>
  ): FlightResponse;
}

declare module "react-server-dom-webpack/writer.node.server" {
  import React from "react";
  import { Writable } from "node:stream";

  export interface ModuleReference {
    $$typeof: symbol;
    filepath: string;
    name: string;
  }

  export interface ModuleMetadata {
    id: string;
    chunks: string[];
    name: string;
  }

  export type BundlerConfig = {
    [filepath: string]: {
      [name: string]: ModuleMetadata;
    };
  };

  export interface Options {
    onError?: (error: unknown) => void;
  }

  export interface Controls {
    pipe<T extends Writable>(destination: T): T;
  }

  export function renderToPipeableStream(
    children: React.ReactChild | Iterable<React.ReactNode>,
    bundlerConfig: BundlerConfig,
    options?: Options
  ): Controls;
}
