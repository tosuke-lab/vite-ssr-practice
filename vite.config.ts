import { defineConfig, UserConfig } from "vite";
import viteReact from "@vitejs/plugin-react";

function extendConfig<C extends UserConfig>(config: C): C {
  return config;
}

export default defineConfig((env) => {
  const dev = env.mode === "development";

  const config = extendConfig({
    plugins: [viteReact()],
    ssr: {
      noExternal: !dev,
    },
    resolve: {
      alias: [{ find: "stream", replacement: "/polyfill/stream" }],
    },
  });

  return config;
});
