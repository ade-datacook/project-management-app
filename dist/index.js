// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  photoUrl: text("photoUrl"),
  color: varchar("color", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#808080"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  resourceId: int("resourceId").notNull(),
  clientId: int("clientId").notNull(),
  deadline: timestamp("deadline"),
  workload: int("workload").notNull().default(0),
  // in half-days (1 = 0.5 day, 2 = 1 day)
  estimatedDays: int("estimatedDays").default(0),
  // Estimation stockée, affichée dans les commentaires
  isCompleted: boolean("isCompleted").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  weekNumber: int("weekNumber").notNull(),
  year: int("year").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getAllResources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(resources);
}
async function createResource(resource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(resources).values(resource);
  return result;
}
async function getClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients);
}
async function toggleClientActive(clientId, isActive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ isActive }).where(eq(clients.id, clientId));
  return { success: true };
}
async function createClient(client) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(client);
  return result;
}
async function getTasksByWeek(weekNumber, year) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year))).orderBy(tasks.createdAt);
}
async function createTask(task) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(task);
  return result;
}
async function updateTask(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(tasks).set(updates).where(eq(tasks.id, id));
  return result;
}
async function deleteTask(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(tasks).where(eq(tasks.id, id));
  return result;
}
async function getWeeklyTotals(weekNumber, year) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    resourceId: tasks.resourceId,
    totalWorkload: sql`CAST(COALESCE(SUM(${tasks.workload}), 0) AS DECIMAL(10,2))`
  }).from(tasks).where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year))).groupBy(tasks.resourceId);
  const converted = result.map((r) => ({
    resourceId: r.resourceId,
    totalWorkload: typeof r.totalWorkload === "string" ? parseFloat(r.totalWorkload) : r.totalWorkload
  }));
  return converted;
}
async function getAnnualDataByClient(year) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    clientId: tasks.clientId,
    month: sql`CEIL(${tasks.weekNumber} / 4.33) as month`,
    totalWorkload: sql`COALESCE(SUM(${tasks.workload}), 0) as totalWorkload`
  }).from(tasks).where(eq(tasks.year, year)).groupBy(tasks.clientId, sql`month`);
  return result.map((r) => ({
    clientId: r.clientId,
    month: typeof r.month === "string" ? parseInt(r.month) : r.month,
    totalWorkload: typeof r.totalWorkload === "string" ? parseFloat(r.totalWorkload) : r.totalWorkload
  }));
}
async function updateClientColor(clientId, color) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ color }).where(eq(clients.id, clientId));
  return { success: true };
}
async function getWeeklyKPIs(weekNumber, year) {
  const db = await getDb();
  if (!db) return { totalEstimated: 0, totalActual: 0, variance: 0 };
  const result = await db.select({
    totalEstimated: sql`COALESCE(SUM(${tasks.estimatedDays}), 0)`,
    totalActual: sql`COALESCE(SUM(${tasks.workload}), 0)`
  }).from(tasks).where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year)));
  if (result.length === 0) {
    return { totalEstimated: 0, totalActual: 0, variance: 0 };
  }
  const estimated = Number(result[0].totalEstimated) || 0;
  const actual = (Number(result[0].totalActual) || 0) / 2;
  const variance = actual - estimated;
  return {
    totalEstimated: estimated,
    totalActual: actual,
    variance
  };
}
async function getAnnualDataByResource(year) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    resourceId: tasks.resourceId,
    month: sql`CEIL(${tasks.weekNumber} / 4.33) as month`,
    totalWorkload: sql`COALESCE(SUM(${tasks.workload}), 0) as totalWorkload`,
    totalEstimated: sql`COALESCE(SUM(${tasks.estimatedDays}), 0) as totalEstimated`
  }).from(tasks).where(eq(tasks.year, year)).groupBy(tasks.resourceId, sql`month`);
  return result.map((r) => ({
    resourceId: r.resourceId,
    month: typeof r.month === "string" ? parseInt(r.month) : r.month,
    totalWorkload: typeof r.totalWorkload === "string" ? parseFloat(r.totalWorkload) : r.totalWorkload,
    totalEstimated: typeof r.totalEstimated === "string" ? parseFloat(r.totalEstimated) : r.totalEstimated
  }));
}

// server/weeklyReset.ts
import { eq as eq2, and as and2 } from "drizzle-orm";
async function resetWeeklyTasks(fromWeek, fromYear, toWeek, toYear) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const previousTasks = await db.select().from(tasks).where(
    and2(
      eq2(tasks.weekNumber, fromWeek),
      eq2(tasks.year, fromYear),
      eq2(tasks.isCompleted, false)
      // Only non-completed tasks
    )
  );
  const newTasks = previousTasks.map((task) => ({
    name: task.name,
    notes: task.notes,
    resourceId: task.resourceId,
    clientId: task.clientId,
    deadline: task.deadline,
    workload: 0,
    // Réinitialiser la charge pour toutes les tâches dupliquées
    estimatedDays: task.estimatedDays || 0,
    isCompleted: false,
    // Reset completion status
    weekNumber: toWeek,
    year: toYear
  }));
  if (newTasks.length > 0) {
    await db.insert(tasks).values(newTasks);
  }
  return newTasks.length;
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  resources: router({
    list: publicProcedure.query(async () => {
      return await getAllResources();
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string(),
      photoUrl: z2.string().optional(),
      color: z2.string()
    })).mutation(async ({ input }) => {
      return await createResource(input);
    })
  }),
  clients: router({
    list: publicProcedure.query(async () => {
      return await getClients();
    }),
    toggleActive: publicProcedure.input(z2.object({ id: z2.number(), isActive: z2.boolean() })).mutation(async ({ input }) => {
      return await toggleClientActive(input.id, input.isActive);
    }),
    updateColor: publicProcedure.input(z2.object({ id: z2.number(), color: z2.string() })).mutation(async ({ input }) => {
      return await updateClientColor(input.id, input.color);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string(),
      color: z2.string().default("#808080")
    })).mutation(async ({ input }) => {
      return await createClient(input);
    })
  }),
  tasks: router({
    listByWeek: publicProcedure.input(z2.object({
      weekNumber: z2.number(),
      year: z2.number()
    })).query(async ({ input }) => {
      return await getTasksByWeek(input.weekNumber, input.year);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string(),
      notes: z2.string().optional(),
      resourceId: z2.number(),
      clientId: z2.number(),
      deadline: z2.date().nullable().optional(),
      workload: z2.number().default(0),
      estimatedDays: z2.number().default(0),
      taskType: z2.enum(["oneshot", "recurring"]).default("oneshot"),
      weekNumber: z2.number(),
      year: z2.number()
    })).mutation(async ({ input }) => {
      return await createTask(input);
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      notes: z2.string().optional(),
      resourceId: z2.number().optional(),
      clientId: z2.number().optional(),
      deadline: z2.date().nullable().optional(),
      workload: z2.number().optional(),
      taskType: z2.enum(["oneshot", "recurring"]).optional(),
      isCompleted: z2.boolean().optional()
    })).mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await updateTask(id, updates);
    }),
    delete: publicProcedure.input(z2.object({
      id: z2.number()
    })).mutation(async ({ input }) => {
      return await deleteTask(input.id);
    }),
    weeklyTotals: publicProcedure.input(z2.object({
      weekNumber: z2.number(),
      year: z2.number()
    })).query(async ({ input }) => {
      return await getWeeklyTotals(input.weekNumber, input.year);
    }),
    weeklyKPIs: publicProcedure.input(z2.object({
      weekNumber: z2.number(),
      year: z2.number()
    })).query(async ({ input }) => {
      return await getWeeklyKPIs(input.weekNumber, input.year);
    }),
    annualData: publicProcedure.input(z2.object({
      year: z2.number()
    })).query(async ({ input }) => {
      return await getAnnualDataByClient(input.year);
    }),
    annualDataByResource: publicProcedure.input(z2.object({
      year: z2.number()
    })).query(async ({ input }) => {
      return await getAnnualDataByResource(input.year);
    }),
    resetWeek: publicProcedure.input(z2.object({
      fromWeek: z2.number(),
      fromYear: z2.number(),
      toWeek: z2.number(),
      toYear: z2.number()
    })).mutation(async ({ input }) => {
      const count = await resetWeeklyTasks(
        input.fromWeek,
        input.fromYear,
        input.toWeek,
        input.toYear
      );
      return { success: true, count };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  return {
    req: opts.req,
    res: opts.res,
    user: null
    // On renvoie toujours null, c'est public
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var plugins = [react(), tailwindcss(), jsxLocPlugin()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  envDir: __dirname,
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client", "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    // Configuration simple pour le local
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
var __filename = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename);
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        // <--- Remplacé (était import.meta.dirname)
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(__dirname2, "../..", "dist", "public") : path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
process.on("SIGTERM", () => {
  console.log("[process] SIGTERM received");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("[process] SIGINT received");
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  console.error("[process] uncaughtException", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("[process] unhandledRejection", err);
  process.exit(1);
});
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
