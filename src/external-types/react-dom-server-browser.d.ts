declare module "react-dom/server.browser.js" {
  import React from "react";

  export function renderToString(element: React.ReactElement): string;

  export interface RenderOptions {
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

  export function renderToReadableStream(
    children: React.ReactChild | Iterable<React.ReactNode>,
    options?: RenderOptions
  ): ReadableStream;

  export as namespace ReactDOMServer;
}
