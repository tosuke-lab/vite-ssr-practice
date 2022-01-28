import fs from "node:fs/promises";
import { createServer as createViteServer } from "vite";
import express from "express";

async function createServer() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: "ssr" },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    try {
      const indexHtml = await fs
        .readFile("index.html", { encoding: "utf8" })
        .then((html) =>
          html.replace("/src/entry-client.tsx", "/src/entry-client.dev.js")
        );

      const htmlScripts = await vite.transformIndexHtml(
        req.originalUrl,
        indexHtml
      );

      const serverModule = (await vite.ssrLoadModule(
        "/src/entry-server.tsx"
      )) as typeof import("./entry-server");

      const controller = new AbortController();
      const searchParams = new URLSearchParams();
      for (const [key, values] of Object.entries(req.query)) {
        if (typeof values === "string") {
          searchParams.append(key, values);
        } else if (Array.isArray(values)) {
          for (const value of values) {
            if (typeof value === "string") {
              searchParams.append(key, value);
            }
          }
        }
      }
      const result = await serverModule.renderToStream({
        pathname: req.path,
        searchParams,
        signal: controller.signal,
        bodyElements: htmlScripts,
      });

      res.status(result.statusCode);
      res.header(result.headers);

      const reader = result.stream.getReader();
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        await new Promise<void>((resolve, reject) => {
          res.write(r.value, (err) => {
            if (err == null) {
              resolve();
            } else {
              reject(err);
            }
          });
        });
      }
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
