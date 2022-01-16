import { renderToReadableStream } from "./framework/server/renderToReadableStream";
import { App } from "./App";
import { ServerCache } from "./framework/server/cache";
import { CacheContext } from "./framework/shared/cache";

type RenderOptions = {
  readonly signal?: AbortSignal;
  readonly bodyElements?: string;
};

type RenderResult = {
  readonly statusCode: number;
  readonly stream: ReadableStream;
};

export async function renderToStream({ signal, bodyElements }: RenderOptions) {
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

    const injectHead = new TransformStream<ArrayBuffer>({
      start(controller) {
        controller.enqueue(textEncoder.encode("<!doctype html><html><head>"));
      },
      transform(chunk, controller) {
        if (shouldInjectHead) {
          const head =
            '<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>';
          controller.enqueue(textEncoder.encode(head));
          controller.enqueue(textEncoder.encode("</head><body>"));
          controller.enqueue(textEncoder.encode(bodyElements));

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
    }).pipeThrough(injectHead);
  });
}
