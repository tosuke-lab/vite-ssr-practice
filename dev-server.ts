import fs from "node:fs/promises";
import webstreams from "node:stream/web";
import { createServer as createViteServer } from "vite";
import express from "express";

Object.defineProperty(global, "TransformStream", {
  value: webstreams.TransformStream,
});
Object.defineProperty(global, "ReadableStream", {
  value: webstreams.ReadableStream,
});

async function createServer() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: "ssr" },
  });
  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    try {
      const indexHtml = await fs.readFile("index.html", { encoding: "utf8" });

      const htmlScripts = await vite.transformIndexHtml(
        req.originalUrl,
        indexHtml
      );

      const serverModule = (await vite.ssrLoadModule(
        "/src/entry-server.tsx"
      )) as typeof import("./src/entry-server");

      const controller = new AbortController();
      const result = await serverModule.renderToStream({
        signal: controller.signal,
        bodyElements: htmlScripts,
      });

      res.status(result.statusCode);
      res.contentType("text/html");

      const resWritable = new webstreams.WritableStream<ArrayBuffer>({
        write(chunk) {
          res.write(chunk);
        },
        abort(err) {
          throw err;
        },
      });
      await result.stream.pipeTo(resWritable);
    } catch (e) {
      if (e instanceof Error) {
        vite.ssrFixStacktrace(e);
        console.log(e.stack);
        res.status(500).end(e.stack);
      } else {
        console.error(e);
        res.status(500).end("Internal Server Error");
      }
    } finally {
      res.end();
    }
  });

  return { app, vite };
}

createServer().then(({ app }) => {
  app.listen(3000, () => {
    console.log("http://localhost:3000");
  });
});
