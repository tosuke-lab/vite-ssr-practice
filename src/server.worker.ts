import indexHtml from "../dist/client/index.html?raw";
import { renderToStream } from "./entry-server";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

async function handleRequest(event: FetchEvent) {
  const url = new URL(event.request.url);

  if (/\.(js|css|ico)$/.test(url.pathname)) {
    return await handleAsset(event, url);
  }

  const { signal, cancel } = timeoutSignal(10 * 1000);

  try {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    signal.addEventListener("abort", () => {
      writer.close();
    });

    const { statusCode, stream } = await renderToStream({
      signal,
      headElements: indexHtml,
    });

    const reader = stream.getReader();
    void (async () => {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, {
      status: 500,
    });
  } finally {
    cancel();
  }
}

async function handleAsset(event: FetchEvent, url: URL) {
  try {
    const response = await getAssetFromKV(event, {});
    return response;
  } catch (e) {
    const pathname = url.pathname;
    return new Response(`"${pathname}" not found`, {
      status: 404,
    });
  }
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  const cancel = () => {
    clearTimeout(timeout);
  };
  return {
    signal,
    cancel,
  } as const;
}

addEventListener("fetch", (eventBase) => {
  const event = eventBase as FetchEvent;
  event.respondWith(handleRequest(event));
});
