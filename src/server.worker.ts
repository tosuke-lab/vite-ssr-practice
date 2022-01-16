// @ts-nocheck
import indexHtml from "../dist/client/index.html?raw";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

const textEncoder = new TextEncoder();
(globalThis as any).Buffer = {
  from(chunk: string) {
    return textEncoder.encode(chunk);
  },
};

(globalThis as any).setImmediate = (cb: () => void) => {
  void cb();
};

async function handleAsset(event: FetchEvent, url: URL) {
  try {
    const response = await getAssetFromKV(event, {});
    return response;
  } catch (e) {
    const pathname = url.pathname;
    return new Response(`"${pathname}" not found`, {
      status: 404,
      statusText: "not found",
    });
  }
}

addEventListener("fetch", (eventBase) => {
  const event = eventBase as FetchEvent;
  const url = new URL(event.request.url);

  if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith(handleAsset(event, url));
    return;
  }

  event.respondWith(
    import("./entry-server").then((mod) =>
      mod
        .renderToStream({ headElements: indexHtml })
        .then(async ({ statusCode, stream }) => {
          const { readable, writable } = new TransformStream();
          void (async () => {
            const reader = stream.getReader();
            const writer = writable.getWriter();
            try {
              for (;;) {
                const r = await reader.read();
                if (r.done) break;
                await writer.write(r.value);
              }
            } finally {
              writer.close();
            }
          })();
          return new Response(readable, {
            status: statusCode,
            headers: {
              "content-type": "text/html",
            },
          });
        })
        .catch((error) => {
          return new Response(error.message, {
            status: 500,
          });
        })
    )
  );
});
