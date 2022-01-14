import React from "react";
import ReactDOMServer from "react-dom/server";
import { Writable } from "node:stream";

declare module "react-dom/server" {
  interface RenderOptions {
    identifierPrefix?: string;
    namespaceURI?: string;
    nonce?: string;
    bootstrapScriptContent?: string;
    bootstrapScripts?: string[];
    bootstrapModules?: string[];
    progressiveChunkSize?: number;
    onCompleteShell?: () => void;
    onCompleteAll?: () => void;
    onError?: (error: unknown) => void;
  }

  interface RenderControls {
    abort(): void;
    pipe<T extends Writable>(destination: T): T;
  }

  function renderToPipeableStream(
    children: React.ReactChild | Iterable<React.ReactNode>,
    options?: RenderOptions
  ): RenderControls;
}

declare module "react-dom/server.browser" {
  function renderToString(element: React.ReactElement): string;

  interface RenderOptions {
    identifierPrefix?: string;
    namespaceURI?: string;
    nonce?: string;
    bootstrapScriptContent?: string;
    bootstrapScripts?: string[];
    bootstrapModules?: string[];
    progressiveChunkSize?: number;
    signal?: AbortSignal;
    onCompleteShell?: () => void;
    onCompleteAll?: () => void;
    onError?: (error: unknown) => void;
  }

  function renderToReadableStream(
    children: React.ReactChild | Iterable<React.ReactNode>,
    options?: RenderOptions
  ): ReadableStream;
}
