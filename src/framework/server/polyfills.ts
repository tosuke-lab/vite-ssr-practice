// from https://github.com/vercel/next.js/blob/10c4f5d13338151cc4e75cefb9dfabfd8cf636be/packages/next/server/web/sandbox/polyfills.ts
export function createReadableStream<T>(opts: UnderlyingSource<T> = {}) {
  let closed = false;
  let pullPromise: any;

  let transformController: TransformStreamDefaultController;
  const { readable, writable } = new TransformStream(
    {
      start: (controller: TransformStreamDefaultController) => {
        transformController = controller;
      },
    },
    undefined,
    {
      highWaterMark: 1,
    }
  );

  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const controller: ReadableStreamController<T> = {
    get desiredSize() {
      return transformController.desiredSize;
    },
    close: () => {
      if (!closed) {
        closed = true;
        writer.close();
      }
    },
    enqueue: (chunk: T) => {
      writer.write(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      pull();
    },
    error: (reason: any) => {
      transformController.error(reason);
    },
  };

  const pull = () => {
    if (opts.pull) {
      if (!pullPromise) {
        pullPromise = Promise.resolve().then(() => {
          pullPromise = 0;
          opts.pull!(controller);
        });
      }
    }
  };

  if (opts.start) {
    opts.start(controller);
  }

  if (opts.cancel) {
    readable.cancel = (reason: any) => {
      opts.cancel!(reason);
      return readable.cancel(reason);
    };
  }

  pull();

  return readable;
}
