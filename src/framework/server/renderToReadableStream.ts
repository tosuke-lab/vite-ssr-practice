import type { default as streamInternal } from "stream";
import ReactDOMServer, { RenderControls } from "react-dom/server";
import type { RenderOptions } from "react-dom/server.browser.js";
import React from "react";
import { ReadableStream } from "web-streams-polyfill/ponyfill/es2018";

// https://github.com/facebook/react/issues/22772 の回避のため，Node.jsのWritableをモックして描画する
export function renderToReadableStream(
  element: React.ReactChild | Iterable<React.ReactNode>,
  { signal, ...options }: RenderOptions
): ReadableStream<ArrayBuffer> {
  const textEncoder = new TextEncoder();

  let control: RenderControls;
  let piped: boolean = false;
  let stalled: boolean = false;
  const drainListeners: Array<() => void> = [];

  const stream = new ReadableStream<ArrayBuffer>({
    start() {
      control = ReactDOMServer.renderToPipeableStream(element, options);
      signal?.addEventListener("abort", () => control.abort());
    },
    async pull(controller) {
      if (!piped) {
        const writable = {
          write(chunk: Buffer | string) {
            const buf: Uint8Array =
              typeof chunk === "string" ? textEncoder.encode(chunk) : chunk;
            controller.enqueue(buf);
            const moreWritable = controller.desiredSize! > 0;
            if (!moreWritable) {
              stalled = true;
            }
            // FIXME: 本当はbackPressureを適用したほうがいいが，常にネットワーク側に流そうとしているので，動いてしまう
            return true;
          },
          end() {
            controller.close();
          },
          destroy(err: unknown) {
            controller.error(err);
          },
          on(type: string, listener: () => void) {
            if (type === "drain") {
              drainListeners.push(listener);
            }
          },
        };
        control.pipe(writable as streamInternal.Writable);
        piped = true;
        return;
      }
      if (stalled) {
        drainListeners.forEach((listener) => listener());
        stalled = false;
        return;
      }
    },
  });
  return stream;
}
