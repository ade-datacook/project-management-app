process.on('SIGTERM', () => {
  console.log('[process] SIGTERM received');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[process] SIGINT received');
  process.exit(0);
});

process.on('uncaughtException', err => {
  console.error('[process] uncaughtException', err);
  process.exit(1);
});

process.on('unhandledRejection', err => {
  console.error('[process] unhandledRejection', err);
  process.exit(1);
});

import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import net from "net";
import path from "path";
import { appendFileSync } from "fs";

// Helper for startup logging
export function logStartup(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    const logPath = path.resolve(process.cwd(), "startup.log");
    appendFileSync(logPath, logMessage);
  } catch (e) {
    // ignore
  }
}

logStartup("[startup] Server process started");
logStartup(`[startup] CWD: ${process.cwd()}`);
logStartup(`[startup] NODE_ENV: ${process.env.NODE_ENV}`);

// Load environment-specific configuration BEFORE other imports
const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  `.env.${nodeEnv}`,
  '.env',
  '.env.production',
  '.env.development'
];

for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logStartup(`[env] Loaded environment from ${file}`);
    break;
  }
}

if (!process.env.DATABASE_URL) {
  logStartup("[error] DATABASE_URL is not defined! This will cause a crash.");
} else {
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ":****@");
  logStartup(`[env] DATABASE_URL is defined: ${maskedUrl.split('?')[0]}`);
}

// Now we can safe-import things that depend on process.env
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { sql } from "drizzle-orm";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const { appRouter } = await import("../routers");
  const { createContext } = await import("./context");
  const { serveStatic, setupVite } = await import("./vite");

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Google Auth routes
  app.get("/api/auth/google", async (req, res) => {
    const { getGoogleAuthUrl } = await import("./googleAuth");
    res.redirect(getGoogleAuthUrl(req));
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { handleGoogleCallback } = await import("./googleAuth");
    await handleGoogleCallback(req, res);
  });

  // Health check route
  app.get("/api/health", async (_req, res) => {
    try {
      const { db } = await import("../db");
      await db.execute(sql`SELECT 1`);
      res.json({ status: "ok", db: "connected", env: process.env.NODE_ENV });
    } catch (err) {
      res.status(500).json({ status: "error", error: (err as Error).message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const portEnv = process.env.PORT || "3000";
  logStartup(`[startup] process.env.PORT value: "${portEnv}"`);

  // Passenger provides a pipe string in process.env.PORT. 
  // IMPORTANT: On some systems it might look like a number but is actually a pipe path.
  // Generally, if it's "3000" it's likely NOT Passenger.
  const isNumeric = /^\d+$/.test(portEnv);

  if (isNumeric) {
    const preferredPort = parseInt(portEnv);
    const port = await findAvailablePort(preferredPort);
    server.listen(port, () => {
      logStartup(`[startup] Server (Standalone) running on http://localhost:${port}/`);
    });
  } else {
    // Passenger mode (Unix socket/pipe)
    server.listen(portEnv, () => {
      logStartup(`[startup] Server (Passenger) running on pipe: ${portEnv}`);
    });
  }
}

startServer().catch(err => {
  logStartup(`[fatal] Failed to start server: ${err.stack || err}`);
  process.exit(1);
});
