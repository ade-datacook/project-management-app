import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { logStartup } from "./index";
// Vite is only used in development, we'll import it dynamically in setupVite
// to avoid production errors when devDependencies are missing.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
    fs: { strict: false }, // Relaxed for debugging
  };

  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    root: path.resolve(process.cwd(), "client"),
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../..", "dist", "public")
      : path.resolve(__dirname, "public");

  // Log the path being used for static files
  logStartup(`[static] Checking assets in: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    logStartup(`[static] ERROR: Could not find the build directory: ${distPath}`);
  } else {
    const files = fs.readdirSync(distPath);
    logStartup(`[static] Directory found. Files/Folders: ${files.join(", ")}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    logStartup(`[static] Fallback triggered for: ${req.originalUrl}`);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}