import { defineConfig, UserConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { granularChunk } from "./src/framework/plugins/granular-chunk";
import { serverComponents } from "./src/framework/plugins/server-components";

function extendConfig<C extends UserConfig>(config: C): C {
  return config;
}

export default defineConfig((env) => {
  const prod = env.mode === "production";

  const config = extendConfig({
    plugins: [
      viteReact(),
      serverComponents(),
      granularChunk({
        react: [
          "react",
          "react-dom",
          "react-server-dom-webpack",
          "scheduler",
          "object-assign",
        ],
      }),
    ],
    ssr: {
      external:
        env.command !== "build"
          ? ["react-server-dom-webpack/writer.node.server"]
          : undefined,
      noExternal: env.command !== "serve",
      target: "webworker",
    },
    resolve: {
      alias: [
        { find: "stream", replacement: "/aliases/stream" },
        {
          find: "react-dom/server",
          replacement: "/aliases/react-dom-server.cjs",
        },
      ],
    },
    build: {
      minify: prod,
      sourcemap: true,
      rollupOptions: {
        plugins: [
          /^yes|true$/i.test(process.env.ANALYZE) &&
            visualizer({
              open: true,
              filename: "dist/stats.html",
              gzipSize: true,
              brotliSize: true,
            }),
        ].filter(<T>(x: T | false): x is T => x !== false),
      },
    },
  });

  return config;
});
