import { renderToReadableStream } from "./server/renderToReadableStream";
import { App } from "./App";

type RenderOptions = {
  readonly signal?: AbortSignal;
  readonly bodyElements?: string;
};

type RenderResult = {
  readonly statusCode: number;
  readonly stream: ReadableStream;
};

export async function renderToStream({ signal, bodyElements }: RenderOptions) {
  const el = (
    <div id="app">
      <App />
    </div>
  );

  const textEncoder = new TextEncoder();

  return await new Promise<RenderResult>((resolve, reject) => {
    let shouldInjectHead = false;

    const injectHead = new TransformStream({
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
