import { Plugin, normalizePath, transformWithEsbuild } from "vite";
import fs from "fs/promises";
import path from "path";
import MagicString from "magic-string";
import * as esModuleLexer from "es-module-lexer";

export const serverComponents = (): Plugin => {
  let config: Parameters<NonNullable<Plugin["configResolved"]>>[0];

  const isServerComponent = (id: string) => /\.server(\.[jt]sx?)?$/.test(id);
  const isClientComponent = (id: string) => /\.client(\.[jt]sx?)?$/.test(id);

  // Server Component or Shared Component which required by Server Component
  const isServerModeComponent = (id: string) =>
    isServerComponent(id) || id.endsWith("?server");

  return {
    name: "vite-plugin-react-server-components",
    enforce: "pre",
    configResolved(c) {
      config = c;
    },
    async resolveId(source, importer, options) {
      if (options?.ssr) {
        if (isServerModeComponent(importer) && isClientComponent(source)) {
          const resolution = await this.resolve(source, importer, {
            skipSelf: true,
            ...options,
          });
          if (resolution == null || resolution.external) return resolution;
          return `${resolution.id}?flight`;
        }
        if (isServerModeComponent(importer) && !isServerComponent(source)) {
          const resolution = await this.resolve(source, importer, {
            skipSelf: true,
            ...options,
          });
          if (resolution == null || resolution.external) return resolution;
          return `${resolution.id}?server`;
        }
      }
    },
    async load(id) {
      if (id.endsWith("?server")) {
        const originalId = id.slice(0, -"?server".length);
        return await fs.readFile(originalId, "utf8");
      }
      if (id.endsWith("?flight")) {
        const originalId = id.slice(0, -"?flight".length);
        const source = await fs.readFile(originalId, "utf8");
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
