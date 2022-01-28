import "./framework/shared/webpack-chunk-loader-polyfill";
import {
  renderFlightToReadableStream,
  renderToReadableStream,
} from "./framework/server/renderToReadableStream";
import { App } from "./App.server";
import { ServerCache } from "./framework/server/cache";
import { RSCStore } from "./framework/server/rsc";
import { CacheContext } from "./framework/shared/cache";
import { TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import type { BundlerConfig } from "react-server-dom-webpack/writer.node.server";
import { createFromReadableStream } from "react-server-dom-webpack";
import { Suspense } from "react";

const bundlerConfig = new Proxy(
  {} as { [filepath: string | symbol]: unknown },
  {
    get(target, path) {
      return (target[path] ??= new Proxy(
        {} as { [name: string | symbol]: unknown },
        {
          get(target, name) {
            return (target[name] ??= { id: path, chunks: [path], name });
          },
        }
      ));
    },
  }
) as BundlerConfig;

type RenderOptions = {
  readonly signal?: AbortSignal;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly headElements?: string;
  readonly bodyElements?: string;
};

type RenderResult = {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly stream: globalThis.ReadableStream;
};

export async function renderToStream({
  signal,
  pathname,
  searchParams,
  headElements,
  bodyElements,
}: RenderOptions): Promise<RenderResult> {
  const flightStream = renderFlightToReadableStream(<App />, bundlerConfig);

  if (searchParams.has("flight")) {
    return {
      statusCode: 200,
      stream: flightStream,
      headers: {},
    };
  }

  const [streamForRSC, streamForStore] = flightStream.tee();

  const rscStore = new RSCStore();
  streamForStore.pipeTo(rscStore.sink);
  const flightResponse = createFromReadableStream(streamForRSC);

  const RSCContent = () => flightResponse.readRoot();
  const RSCRoot = () => (
    <Suspense fallback={null}>
      <RSCContent />
    </Suspense>
  );

  const cache = new ServerCache();

  const el = (
    <div id="app">
      <CacheContext.Provider value={cache}>
        <RSCRoot />
      </CacheContext.Provider>
    </div>
  );

  const textEncoder = new TextEncoder();

  return await new Promise<RenderResult>((resolve, reject) => {
    let shouldInjectHead = false;

    let cacheInitialized = false;
    let flightInitialized = false;
    const injectTransform = new TransformStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(textEncoder.encode("<!doctype html><html><head>"));
      },
      transform(chunk, controller) {
        if (shouldInjectHead) {
          const head =
            '<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>';
          controller.enqueue(textEncoder.encode(head));
          if (headElements) {
            controller.enqueue(textEncoder.encode(headElements));
          }
          controller.enqueue(textEncoder.encode("</head><body>"));
          if (bodyElements) {
            controller.enqueue(textEncoder.encode(bodyElements));
          }

          shouldInjectHead = false;
        }

        let script = "";
        // キャッシュの状態変化をクライアントに通知する
        if (cache.hasChanges()) {
          const changes = cache.flushChangedState();
          if (!cacheInitialized) {
            script += "var __cache=[];";
            cacheInitialized = true;
          }
          script += `__cache.push(${JSON.stringify(changes)});`;
        }

        if (rscStore.hasUnreleasedRow) {
          if (!flightInitialized) {
            script += "var __flight=[];";
            flightInitialized = true;
          }
          const rows = rscStore
            .releaseRows()
            .map((row) => {
              const escaped = row.replace(/\\|'/g, (v) => "\\" + v);
              return `'${escaped}'`;
            })
            .join(",");

          script += "__flight.push(";
          script += rows;
          script += ");";
        }
        if (script !== "") {
          controller.enqueue(textEncoder.encode(`<script>${script}</script>`));
        }
        controller.enqueue(chunk);
      },
      flush(controller) {
        let html = "";
        if (flightInitialized) {
          html += '<script>__flight.push("");</script>';
        }
        html += "</body></html>";
        controller.enqueue(textEncoder.encode(html));
      },
    });

    const readable = renderToReadableStream(el, {
      signal,
      onError(error) {
        reject(error);
      },
      onCompleteShell() {
        shouldInjectHead = true;
        Promise.resolve().then(() => {
          resolve({
            statusCode: 200,
            stream: readable,
            headers: {
              "content-type": "text/html",
            },
          });
        });
      },
    }).pipeThrough(injectTransform);
  });
}
