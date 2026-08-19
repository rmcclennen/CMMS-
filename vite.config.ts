import { defineConfig, loadEnv, mergeConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { devtools } from "@tanstack/devtools-vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  const envDefine: Record<string, string> = {};
  if (mode !== "production") {
    const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
    for (const [key, value] of Object.entries(loadedEnv)) {
      envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  const plugins: any[] = [];
  if (mode === "development") {
    plugins.push(devtools({ logging: false, removeDevtoolsOnBuild: false }));
  }
  plugins.push(tailwindcss());
  plugins.push(tsConfigPaths({ projects: ["./tsconfig.json"] }));
  plugins.push(
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      server: { entry: "server" },
    })
  );
  if (command === "build") {
    plugins.push(
      nitro({
        defaultPreset: "cloudflare-module",
      })
    );
  }
  plugins.push(viteReact());

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
    plugins,
  };
});
