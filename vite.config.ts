import { defineConfig, UserConfig } from "vite";
import viteReact from "@vitejs/plugin-react";

function extendConfig<C extends UserConfig>(config: C): C {
  return config;
}

export default defineConfig((env) => {
  const prod = env.mode === "production";

  const config = extendConfig({
    plugins: [viteReact()],
    ssr: {
      noExternal: env.command === "build",
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
    },
  });

  return config;
});
