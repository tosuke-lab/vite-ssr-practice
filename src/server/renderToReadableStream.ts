import type { default as streamInternal } from "stream";
import ReactDOMServer, { RenderControls } from "react-dom/server";
import type { RenderOptions } from "react-dom/server.browser.js";
import React from "react";

export function renderToReadableStream(
  element: React.ReactChild | Iterable<React.ReactNode>,
  { signal, ...options }: RenderOptions
): ReadableStream<ArrayBuffer> {
  const textEncoder = new TextEncoder();

  let control: RenderControls;
  let piped: boolean = false;
  let stalled: boolean = false;
  let drainListeners: Array<() => void> = [];
  return new ReadableStream({
    start() {
      control = ReactDOMServer.renderToPipeableStream(element, options);
      signal?.addEventListener("abort", () => control.abort());
    },
    pull(controller) {
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
            return moreWritable;
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
      }
      if (stalled) {
        drainListeners.forEach((listener) => listener());
        stalled = false;
      }
    },
  });
}
