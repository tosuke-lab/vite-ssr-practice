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
