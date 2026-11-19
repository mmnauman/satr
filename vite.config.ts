import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

function satrLocalApiPlugin(): Plugin {
  return {
    name: "satr-local-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const [key, val] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = val;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) {
          next();
          return;
        }
        try {
          const pathname = new URL(url, "http://localhost").pathname;
          let modPath: string | null = null;
          if (pathname === "/api/health") modPath = "./api/health.ts";
          else if (pathname === "/api/ask") modPath = "./api/ask.ts";
          else if (pathname === "/api/staff") modPath = "./api/staff.ts";
          else if (pathname === "/api/demo") modPath = "./api/demo.ts";
          else if (pathname === "/api/cases") modPath = "./api/cases/index.ts";
          else if (pathname.startsWith("/api/cases/")) modPath = "./api/cases/[code].ts";

          if (!modPath) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }

          const loaded = (await server.ssrLoadModule(modPath)) as {
            default: (req: unknown, res: unknown) => Promise<void>;
          };
          await loaded.default(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Local API error" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), satrLocalApiPlugin()],
  build: {
    // Libraries change rarely, so they get their own long-cached chunks next to Satr's code.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("node_modules/motion") || id.includes("node_modules/framer-motion")) return "motion";
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
});
