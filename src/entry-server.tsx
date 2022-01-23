import { renderToReadableStream } from "./framework/server/renderToReadableStream";
import { App } from "./App";
import { ServerCache } from "./framework/server/cache";
import { CacheContext } from "./framework/shared/cache";
import {
  ReadableStream,
  TransformStream,
} from "web-streams-polyfill/ponyfill/es2018";

(globalThis as any).ReadableStream = ReadableStream;

type RenderOptions = {
  readonly signal?: AbortSignal;
  readonly headElements?: string;
  readonly bodyElements?: string;
};

type RenderResult = {
  readonly statusCode: number;
  readonly stream: globalThis.ReadableStream;
};

export async function renderToStream({
  signal,
  headElements,
  bodyElements,
}: RenderOptions) {
  const cache = new ServerCache();

  const el = (
    <CacheContext.Provider value={cache}>
      <div id="app">
        <App />
      </div>
    </CacheContext.Provider>
  );

  const textEncoder = new TextEncoder();

  return await new Promise<RenderResult>((resolve, reject) => {
    let shouldInjectHead = false;

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
        // キャッシュの状態変化をクライアントに通知する
        if (cache.hasChanges()) {
          const changes = cache.flushChangedState();
          controller.enqueue(
            textEncoder.encode(
              `<script>(self.__cache||(self.__cache=[])).push(${JSON.stringify(
                changes
              )})</script>`
            )
          );
        }
        controller.enqueue(chunk);
      },
      flush(controller) {
        controller.enqueue(textEncoder.encode("</body></html>"));
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
          });
        });
      },
    }).pipeThrough(injectTransform);
  });
}
