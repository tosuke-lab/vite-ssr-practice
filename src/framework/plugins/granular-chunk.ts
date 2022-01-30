import { type Plugin } from "vite";
import type { GetManualChunk, ManualChunksOption } from "rollup";

export function granularChunk(option?: ManualChunksOption): Plugin {
  return {
    name: "vite-granular-chunk",
    config: async (config) => {
      if (
        config.build?.ssr ||
        config.build?.rollupOptions?.inlineDynamicImports
      ) {
        return config;
      }
      return {
        build: {
          rollupOptions: {
            output: {
              manualChunks(...args) {
                if (option != null) {
                  const upstream = runManualChunks(option, ...args);
                  if (upstream != null) {
                    return upstream;
                  }
                }
                const [id] = args;

                // TODO: モジュールグラフ上の近さを利用して分類する
                if (/\/node_modules\//.test(id)) {
                  return "commons";
                }
              },
            },
          },
        },
      };
    },
  };
}

function runManualChunks(
  option: ManualChunksOption,
  ...args: Parameters<GetManualChunk>
): ReturnType<GetManualChunk> {
  if (typeof option === "function") {
    return option(...args);
  }
  const [id] = args;
  for (const [chunkAlias, packages] of Object.entries(option)) {
    for (const pkg of packages) {
      if (id.includes(`/${pkg}/`)) {
        return chunkAlias;
      }
    }
  }
}
