import { Plugin, normalizePath } from "vite";
import fs from "fs/promises";
import path from "path";
import MagicString from "magic-string";
import * as esModuleLexer from "es-module-lexer";
import { PluginContext } from "rollup";

const isServerComponent = (id?: string) =>
  id && /\.server(\.[jt]sx?)?$/.test(id);
const isClientComponent = (id?: string) =>
  id && /\.client(\.[jt]sx?)?$/.test(id);
// Server Component or Shared Component which required by Server Component
const isServerModeComponent = (id?: string) =>
  isServerComponent(id) || (id?.endsWith("?flight-server") ?? false);

export const serverComponents = (): Plugin[] => {
  const name = "vite-server-components";

  let config: Parameters<NonNullable<Plugin["configResolved"]>>[0];

  return [
    {
      name: `${name}:pre`,
      enforce: "pre",
      configResolved(c) {
        config = c;
      },
      async resolveId(source, importer, options) {
        if (source === "vite/preload-helper") {
          return;
        }
        if (isServerModeComponent(importer)) {
          const resolution = await this.resolve(source, importer, {
            skipSelf: true,
            ...options,
          });
          if (
            resolution == null ||
            resolution.external ||
            resolution.id.startsWith("\x00") ||
            resolution.id.includes("node_modules")
          ) {
            return resolution;
          }
          if (isClientComponent(source)) {
            return options?.ssr ? `${resolution.id}?flight-client` : resolution;
          }
          if (!isServerComponent(source)) {
            return `${resolution.id}?flight-server`;
          }
        }
      },
      async load(id) {
        if (id.endsWith("?flight-server")) {
          const actualId = id.slice(0, -"?flight-server".length);
          return await fs.readFile(actualId, "utf8");
        }
        if (id.endsWith("?flight-client")) {
          const actualId = id.slice(0, -"?flight-client".length);
          return await fs.readFile(actualId, "utf8");
        }
      },
    },
    {
      name: `${name}`,
      enforce: "post",
      async transform(code, id, options) {
        if (id.endsWith("webpack-chunk-loader-polyfill.js")) {
          return transformWebpackChunkLoaderPolyfill(
            code,
            id,
            options?.ssr ?? false,
            config.root
          );
        }
        if (options?.ssr && id.endsWith("?flight-client")) {
          const originalId = id.slice(0, -"?flight-client".length);
          return await transformClientComponentFromServerComponent(
            code,
            originalId,
            config.root
          );
        }
        if (!options?.ssr && isServerModeComponent(id)) {
          return await transformServerComponentInClient(code, id, (...args) =>
            this.resolve(...args)
          );
        }
      },
    },
  ];
};

function transformWebpackChunkLoaderPolyfill(
  code: string,
  id: string,
  isSSR: boolean,
  root: string
) {
  const CLIENT_COMPONENT_GLOB = "**/*.client.[jt]s(x)?";

  const importerPath = path.dirname(id);

  const pathFromImporterToRoot = normalizePath(
    path.relative(importerPath, root)
  );
  const importPrefix = pathFromImporterToRoot + "/";
  const glob = `"${importPrefix}${CLIENT_COMPONENT_GLOB}"`;
  const importMap = isSSR
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

async function transformClientComponentFromServerComponent(
  code: string,
  originalId: string,
  root: string
) {
  await esModuleLexer.init;
  const [_imports, exports] = esModuleLexer.parse(code);
  const filepath = normalizePath(path.relative(root, originalId));

  const s = new MagicString(code);

  let src = "";
  src += "if(import.meta.hot){\n";
  src += "  import.meta.hot.accept();\n";
  src += "}\n";
  src += 'const MODULE_REFERENCE = Symbol.for("react.module.reference");\n';
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

  s.remove(0, code.length);
  s.append(src);

  return {
    code: s.toString(),
    map: s.generateMap(),
  };
}

async function transformServerComponentInClient(
  code: string,
  id: string,
  resolve: PluginContext["resolve"]
) {
  await esModuleLexer.init;
  const [imports, exports] = esModuleLexer.parse(code);

  const dynamicSources: string[] = [];
  const s = new MagicString(code);

  let lastIndex = 0;
  for (const item of imports) {
    s.remove(lastIndex, item.ss);

    // dynamic import
    if (item.d > -1) {
      dynamicSources.push(code.substring(item.d, item.se + 1));
      continue;
    }

    const name = item.n;
    if (name == null) continue;

    const resolution = await resolve(name, id);

    if (resolution?.id.endsWith("?flight-server")) {
      s.overwrite(item.ss, item.se, `import ${JSON.stringify(name)};`);
      lastIndex = item.se;
    } else if (isClientComponent(name)) {
      dynamicSources.push(`import(${JSON.stringify(name)})`);
    }
  }
  s.remove(lastIndex, code.length);

  let src = "";
  src += `const __rsc_noop__ = () => {${dynamicSources.join(";")}};\n`;
  for (const name of exports) {
    src += "export ";
    if (name === "default") {
      src += "default ";
    } else {
      src += `const ${name} = `;
    }
    src += `__rsc_noop__;\n`;
  }

  s.append(src);

  return {
    code: String(s),
    map: s.generateMap(),
  };
}
