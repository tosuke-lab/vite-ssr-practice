import { defineConfig, UserConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

import { Plugin, normalizePath, transformWithEsbuild } from "vite";
import fs from "fs/promises";
import path from "path";
import MagicString from "magic-string";
import * as esModuleLexer from "es-module-lexer";

const rscPlugin = (): Plugin => {
  let config: Parameters<NonNullable<Plugin["configResolved"]>>[0];

  const isServerComponent = (id: string) => /\.server(\.[jt]sx?)?$/.test(id);

  return {
    name: "vite-plugin-react-server-components",
    enforce: "pre",
    configResolved(c) {
      config = c;
    },
    async resolveId(source, importer, options) {
      if (/\.client(\.[jt]sx?)?$/.test(source) && isServerComponent(importer)) {
        const resolution = await this.resolve(source, importer, {
          skipSelf: true,
          ...options,
        });
        if (resolution == null || resolution.external) return resolution;
        return `${resolution.id}?flight`;
      }
    },
    async load(id) {
      if (id.endsWith("?flight")) {
        const originalId = id.slice(0, -"?flight".length);
        const source = await fs.readFile(originalId, { encoding: "utf8" });
        const { code: transformed } = await transformWithEsbuild(source, id);
        await esModuleLexer.init;
        const exports = esModuleLexer.parse(transformed)[1];
        const filepath = normalizePath(path.relative(config.root, originalId));

        let src = "";
        src +=
          'const MODULE_REFERENCE = Symbol.for("react.module.reference");\n';
        src += `const FILEPATH = ${JSON.stringify(filepath)};\n`;
        for (const name of exports) {
          src += "export ";
          if (name === "default") {
            src += "default ";
          } else {
            src += `const ${name} = `;
          }
          src += "{ $$typeof: MODULE_REFERENCE, filepath: FILEPATH, name: ";
          src += JSON.stringify(name);
          src += "};\n";
        }
        return src;
      }
    },
    transform(code, id, options) {
      if (id.endsWith("webpack-chunk-loader-polyfill.js")) {
        const CLIENT_COMPONENT_GLOB = "**/*.client.[jt]s(x)?";

        const importerPath = path.dirname(id);

        const pathFromImporterToRoot = normalizePath(
          path.relative(importerPath, config.root)
        );
        const importPrefix = pathFromImporterToRoot + "/";
        const glob = `"${importPrefix}${CLIENT_COMPONENT_GLOB}"`;
        const importMap = options?.ssr
          ? `import.meta.globEager(${glob})`
          : `import.meta.glob(${glob})`;

        const s = new MagicString(code);

        function replace(pattern: string, to: string) {
          const pos = code.indexOf(pattern);
          s.overwrite(pos, pos + pattern.length, to);
        }

        replace("__IMPORT_PREFIX__", JSON.stringify(importPrefix));
        replace("__IMPORT_MAP__", importMap);

        return {
          code: String(s),
          map: s.generateMap(),
        };
      }
    },
  };
};

function extendConfig<C extends UserConfig>(config: C): C {
  return config;
}

export default defineConfig((env) => {
  const prod = env.mode === "production";

  const config = extendConfig({
    plugins: [rscPlugin(), viteReact()],
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
      sourcemap: prod ? "hidden" : true,
      rollupOptions: {
        plugins: [
          /^yes|true$/i.test(process.env.ALALYZE) &&
            visualizer({
              open: true,
              filename: "dist/stats.html",
              gzipSize: true,
              brotliSize: true,
            }),
        ],
      },
    },
  });

  return config;
});
