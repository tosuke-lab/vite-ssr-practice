import "./framework/server/webpack-chunk-loader-polyfill";
import { TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Suspense } from "react";
import { createFromReadableStream } from "react-server-dom-webpack";
import type { BundlerConfig } from "react-server-dom-webpack/writer.node.server";
import { createMemoryHistory } from "history";
import { HelmetData, HelmetProvider } from "react-helmet-async";
import {
  renderFlightToReadableStream,
  renderToReadableStream,
} from "./framework/server/render-to-readable-stream";
import { RSCStore, ViteManifest } from "./framework/server/rsc";
import { HistoryContext, LocationContext } from "./framework/shared/router";
import { App } from "./app.server";

if (import.meta.hot) {
  import.meta.hot.accept();
}

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
  readonly viteManifest: ViteManifest;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly bodyElements?: string;
};

type RenderResult = {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly stream: globalThis.ReadableStream;
};

export async function renderToStream({
  signal,
  viteManifest,
  pathname,
  searchParams,
  bodyElements,
}: RenderOptions): Promise<RenderResult> {
  const flightStream = renderFlightToReadableStream(
    <App pathname={pathname} />,
    bundlerConfig
  );

  if (searchParams.has("flight")) {
    return {
      statusCode: 200,
      stream: flightStream,
      headers: {},
    };
  }

  const [streamForRSC, streamForStore] = flightStream.tee();

  const rscStore = new RSCStore(viteManifest);
  streamForStore.pipeTo(rscStore.sink);
  const flightResponse = createFromReadableStream(streamForRSC);

  const RSCContent = () => flightResponse.readRoot();
  const RSCRoot = () => (
    <Suspense fallback={null}>
      <RSCContent />
    </Suspense>
  );

  const history = createMemoryHistory({ initialEntries: [pathname] });
  const helmetContext: { helmet?: HelmetData } = {};

  const el = (
    <div id="app">
      <HelmetProvider context={helmetContext}>
        <HistoryContext.Provider value={history}>
          <LocationContext.Provider
            value={{ location: history.location, isPending: false }}
          >
            <RSCRoot />
          </LocationContext.Provider>
        </HistoryContext.Provider>
      </HelmetProvider>
    </div>
  );

  const textEncoder = new TextEncoder();

  return await new Promise<RenderResult>((resolve, reject) => {
    let shouldInjectHead = false;

    let flightInitialized = false;
    const injectTransform = new TransformStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(textEncoder.encode("<!doctype html><html><head>"));
      },
      transform(chunk, controller) {
        if (shouldInjectHead) {
          let head = "";
          head += `<meta charset="utf-8">`;
          head += `<meta name="viewport" content="width=device-width, initial-scale=1">`;

          // Load dependencies
          if (import.meta.env.PROD) {
            head += rscStore.dependencies("index.html");
          }

          // helmet
          const helmet = helmetContext.helmet;
          if (helmet) {
            head += helmet.title.toString();
            head += helmet.meta.toString();
            head += helmet.link.toString();
          }

          controller.enqueue(textEncoder.encode(head));
          controller.enqueue(textEncoder.encode("</head><body>"));
          if (bodyElements) {
            controller.enqueue(textEncoder.encode(bodyElements));
          }

          shouldInjectHead = false;
        }

        let script = "";

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
