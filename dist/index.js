var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

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
var init_cookies = __esm({
  "server/_core/cookies.ts"() {
    "use strict";
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
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
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
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
  }
});

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t, router, publicProcedure, requireUser, protectedProcedure, adminProcedure;
var init_trpc = __esm({
  "server/_core/trpc.ts"() {
    "use strict";
    init_const();
    t = initTRPC.context().create({
      transformer: superjson
    });
    router = t.router;
    publicProcedure = t.procedure;
    requireUser = t.middleware(async (opts) => {
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
    protectedProcedure = t.procedure.use(requireUser);
    adminProcedure = t.procedure.use(
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
  }
});

// server/_core/systemRouter.ts
import { z } from "zod";
var systemRouter;
var init_systemRouter = __esm({
  "server/_core/systemRouter.ts"() {
    "use strict";
    init_notification();
    init_trpc();
    systemRouter = router({
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
  }
});

// drizzle/schema.ts
import { int, mysqlTable, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";
var users, resources, clients, tasks;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").primaryKey().autoincrement(),
      openId: varchar("openId", { length: 255 }).notNull().unique(),
      name: varchar("name", { length: 255 }),
      email: varchar("email", { length: 255 }),
      loginMethod: varchar("loginMethod", { length: 50 }),
      role: varchar("role", { length: 20, enum: ["user", "admin"] }).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    resources = mysqlTable("resources", {
      id: int("id").primaryKey().autoincrement(),
      name: varchar("name", { length: 255 }).notNull(),
      photoUrl: varchar("photoUrl", { length: 255 }),
      color: varchar("color", { length: 255 }).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    clients = mysqlTable("clients", {
      id: int("id").primaryKey().autoincrement(),
      name: varchar("name", { length: 255 }).notNull(),
      color: varchar("color", { length: 50 }).notNull().default("#808080"),
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    tasks = mysqlTable("tasks", {
      id: int("id").primaryKey().autoincrement(),
      name: varchar("name", { length: 255 }).notNull(),
      notes: varchar("notes", { length: 1e3 }),
      resourceId: int("resourceId").notNull(),
      clientId: int("clientId").notNull(),
      deadline: timestamp("deadline"),
      workload: int("workload").notNull().default(0),
      // in half-days (1 = 0.5 day, 2 = 1 day)
      estimatedDays: int("estimatedDays").default(0),
      isCompleted: boolean("isCompleted").default(false).notNull(),
      isArchived: boolean("isArchived").default(false).notNull(),
      weekNumber: int("weekNumber").notNull(),
      year: int("year").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  createClient: () => createClient,
  createResource: () => createResource,
  createTask: () => createTask,
  db: () => db,
  deleteTask: () => deleteTask,
  getAllResources: () => getAllResources,
  getAnnualDataByClient: () => getAnnualDataByClient,
  getAnnualDataByResource: () => getAnnualDataByResource,
  getClients: () => getClients,
  getDb: () => getDb,
  getTasksByWeek: () => getTasksByWeek,
  getUserByOpenId: () => getUserByOpenId,
  getWeeklyKPIs: () => getWeeklyKPIs,
  getWeeklyTotals: () => getWeeklyTotals,
  toggleClientActive: () => toggleClientActive,
  updateClientColor: () => updateClientColor,
  updateTask: () => updateTask,
  upsertUser: () => upsertUser
});
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
async function getDb() {
  return db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db2 = await getDb();
  if (!db2) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db2.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db2 = await getDb();
  if (!db2) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db2.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllResources() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(resources);
}
async function createResource(resource) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(resources).values(resource);
  return result;
}
async function getClients() {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(clients);
}
async function toggleClientActive(clientId, isActive) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(clients).set({ isActive }).where(eq(clients.id, clientId));
  return { success: true };
}
async function createClient(client) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(clients).values(client);
  return result;
}
async function getTasksByWeek(weekNumber, year) {
  const db2 = await getDb();
  if (!db2) return [];
  return await db2.select().from(tasks).where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year))).orderBy(tasks.createdAt);
}
async function createTask(task) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.insert(tasks).values(task);
  return { id: result[0].insertId };
}
async function updateTask(id, updates) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.update(tasks).set(updates).where(eq(tasks.id, id));
  return result;
}
async function deleteTask(id) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  const result = await db2.delete(tasks).where(eq(tasks.id, id));
  return result;
}
async function getWeeklyTotals(weekNumber, year) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    resourceId: tasks.resourceId,
    totalWorkload: sql`COALESCE(SUM(${tasks.workload}), 0)`
  }).from(tasks).where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year))).groupBy(tasks.resourceId);
  const converted = result.map((r) => ({
    resourceId: r.resourceId,
    totalWorkload: typeof r.totalWorkload === "string" ? parseFloat(r.totalWorkload) : r.totalWorkload
  }));
  return converted;
}
async function getAnnualDataByClient(year) {
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    clientId: tasks.clientId,
    month: sql`CAST((${tasks.weekNumber} / 4.33) + 0.9999 as INTEGER) as month`,
    totalWorkload: sql`COALESCE(SUM(${tasks.workload}), 0) as totalWorkload`
  }).from(tasks).where(eq(tasks.year, year)).groupBy(tasks.clientId, sql`month`);
  return result.map((r) => ({
    clientId: r.clientId,
    month: typeof r.month === "string" ? parseInt(r.month) : r.month,
    totalWorkload: typeof r.totalWorkload === "string" ? parseFloat(r.totalWorkload) : r.totalWorkload
  }));
}
async function updateClientColor(clientId, color) {
  const db2 = await getDb();
  if (!db2) throw new Error("Database not available");
  await db2.update(clients).set({ color }).where(eq(clients.id, clientId));
  return { success: true };
}
async function getWeeklyKPIs(weekNumber, year) {
  const db2 = await getDb();
  if (!db2) return { totalEstimated: 0, totalActual: 0, variance: 0 };
  const result = await db2.select({
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
  const db2 = await getDb();
  if (!db2) return [];
  const result = await db2.select({
    resourceId: tasks.resourceId,
    month: sql`CAST((${tasks.weekNumber} / 4.33) + 0.9999 as INTEGER) as month`,
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
var poolConnection, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    poolConnection = mysql.createPool(process.env.DATABASE_URL);
    db = drizzle(poolConnection);
  }
});

// server/weeklyReset.ts
import { eq as eq2, and as and2 } from "drizzle-orm";
async function resetWeeklyTasks(fromWeek, fromYear, toWeek, toYear) {
  const db2 = await getDb();
  if (!db2) {
    throw new Error("Database not available");
  }
  const previousTasks = await db2.select().from(tasks).where(
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
    await db2.insert(tasks).values(newTasks);
  }
  return newTasks.length;
}
var init_weeklyReset = __esm({
  "server/weeklyReset.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/routers.ts
var routers_exports = {};
__export(routers_exports, {
  appRouter: () => appRouter
});
import { z as z2 } from "zod";
var appRouter;
var init_routers = __esm({
  "server/routers.ts"() {
    "use strict";
    init_const();
    init_cookies();
    init_systemRouter();
    init_trpc();
    init_db();
    init_db();
    init_weeklyReset();
    appRouter = router({
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
  }
});

// server/_core/context.ts
var context_exports = {};
__export(context_exports, {
  createContext: () => createContext
});
async function createContext(opts) {
  return {
    req: opts.req,
    res: opts.res,
    user: null
    // On renvoie toujours null, c'est public
  };
}
var init_context = __esm({
  "server/_core/context.ts"() {
    "use strict";
  }
});

// server/_core/vite.ts
var vite_exports = {};
__export(vite_exports, {
  serveStatic: () => serveStatic,
  setupVite: () => setupVite
});
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
    fs: { strict: false }
    // Relaxed for debugging
  };
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    root: path.resolve(process.cwd(), "client"),
    server: serverOptions,
    appType: "custom"
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
  const distPath = process.env.NODE_ENV === "development" ? path.resolve(__dirname, "../..", "dist", "public") : path.resolve(__dirname, "public");
  logStartup(`[static] Checking assets in: ${distPath}`);
  if (!fs.existsSync(distPath)) {
    logStartup(`[static] ERROR: Could not find the build directory: ${distPath}`);
  } else {
    const files = fs.readdirSync(distPath);
    logStartup(`[static] Directory found. Files/Folders: ${files.join(", ")}`);
  }
  app.use(express.static(distPath));
  app.use("*", (req, res) => {
    logStartup(`[static] Fallback triggered for: ${req.originalUrl}`);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
var __filename, __dirname;
var init_vite = __esm({
  "server/_core/vite.ts"() {
    "use strict";
    init_index();
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  }
});

// server/_core/index.ts
import dotenv from "dotenv";
import express2 from "express";
import fs2 from "fs";
import { createServer } from "http";
import net from "net";
import path2 from "path";
import { appendFileSync } from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { sql as sql2 } from "drizzle-orm";
function logStartup(message) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const logMessage = `[${timestamp2}] ${message}
`;
  console.log(message);
  try {
    const logPath = path2.resolve(process.cwd(), "startup.log");
    appendFileSync(logPath, logMessage);
  } catch (e) {
  }
}
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
  const { appRouter: appRouter2 } = await Promise.resolve().then(() => (init_routers(), routers_exports));
  const { createContext: createContext2 } = await Promise.resolve().then(() => (init_context(), context_exports));
  const { serveStatic: serveStatic2, setupVite: setupVite2 } = await Promise.resolve().then(() => (init_vite(), vite_exports));
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", async (_req, res) => {
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      await db2.execute(sql2`SELECT 1`);
      res.json({ status: "ok", db: "connected", env: process.env.NODE_ENV });
    } catch (err) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter2,
      createContext: createContext2
    })
  );
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    await setupVite2(app, server);
  } else {
    serveStatic2(app);
  }
  const portEnv = process.env.PORT || "3000";
  logStartup(`[startup] process.env.PORT value: "${portEnv}"`);
  const isNumeric = /^\d+$/.test(portEnv);
  if (isNumeric) {
    const preferredPort = parseInt(portEnv);
    const port = await findAvailablePort(preferredPort);
    server.listen(port, () => {
      logStartup(`[startup] Server (Standalone) running on http://localhost:${port}/`);
    });
  } else {
    server.listen(portEnv, () => {
      logStartup(`[startup] Server (Passenger) running on pipe: ${portEnv}`);
    });
  }
}
var nodeEnv, envFiles;
var init_index = __esm({
  "server/_core/index.ts"() {
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
    logStartup("[startup] Server process started");
    logStartup(`[startup] CWD: ${process.cwd()}`);
    logStartup(`[startup] NODE_ENV: ${process.env.NODE_ENV}`);
    nodeEnv = process.env.NODE_ENV || "development";
    envFiles = [
      `.env.${nodeEnv}`,
      ".env",
      ".env.production",
      ".env.development"
    ];
    for (const file of envFiles) {
      const envPath = path2.resolve(process.cwd(), file);
      if (fs2.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        logStartup(`[env] Loaded environment from ${file}`);
        break;
      }
    }
    if (!process.env.DATABASE_URL) {
      logStartup("[error] DATABASE_URL is not defined! This will cause a crash.");
    } else {
      const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ":****@");
      logStartup(`[env] DATABASE_URL is defined: ${maskedUrl.split("?")[0]}`);
    }
    startServer().catch((err) => {
      logStartup(`[fatal] Failed to start server: ${err.stack || err}`);
      process.exit(1);
    });
  }
});
init_index();
export {
  logStartup
};
