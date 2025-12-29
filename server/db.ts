import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, resources, clients, tasks, InsertResource, InsertClient, InsertTask } from "../drizzle/schema";
import { ENV } from './_core/env';

const poolConnection = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(poolConnection);

// Helper to keep existing code working with minor changes, 
// though we can export db directly.
export async function getDb() {
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Resources
export async function getAllResources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(resources);
}

export async function createResource(resource: InsertResource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(resources).values(resource);
  return result;
}

// Clients
export async function getClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients);
}

export async function toggleClientActive(clientId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ isActive }).where(eq(clients.id, clientId));
  return { success: true };
}

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(client);
  return result;
}

// Tasks
export async function getTasksByWeek(weekNumber: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year)))
    .orderBy(tasks.createdAt);
}

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(task);
  return { id: result[0].insertId };
}

export async function updateTask(id: number, updates: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(tasks).set(updates).where(eq(tasks.id, id));
  return result;
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(tasks).where(eq(tasks.id, id));
  return result;
}

export async function getWeeklyTotals(weekNumber: number, year: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      resourceId: tasks.resourceId,
      totalWorkload: sql<number>`COALESCE(SUM(${tasks.workload}), 0)`,
    })
    .from(tasks)
    .where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year)))
    .groupBy(tasks.resourceId);

  // Convert string to number (MySQL returns DECIMAL as string)
  const converted = result.map(r => ({
    resourceId: r.resourceId,
    totalWorkload: typeof r.totalWorkload === 'string' ? parseFloat(r.totalWorkload) : r.totalWorkload,
  }));

  return converted;
}

export async function getAnnualDataByClient(year: number) {
  const db = await getDb();
  if (!db) return [];

  // Group by client and month directly from week number
  // Month = CEIL(weekNumber / 4.33) gives approximate month
  const result = await db
    .select({
      clientId: tasks.clientId,
      month: sql<number>`CAST((${tasks.weekNumber} / 4.33) + 0.9999 as INTEGER) as month`,
      totalWorkload: sql<number>`COALESCE(SUM(${tasks.workload}), 0) as totalWorkload`,
    })
    .from(tasks)
    .where(eq(tasks.year, year))
    .groupBy(tasks.clientId, sql`month`);

  // Convert string to number (MySQL returns DECIMAL as string)
  return result.map(r => ({
    clientId: r.clientId,
    month: typeof r.month === 'string' ? parseInt(r.month) : r.month,
    totalWorkload: typeof r.totalWorkload === 'string' ? parseFloat(r.totalWorkload) : r.totalWorkload,
  }));
}

export async function updateClientColor(clientId: number, color: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ color }).where(eq(clients.id, clientId));
  return { success: true };
}

export async function getWeeklyKPIs(weekNumber: number, year: number) {
  const db = await getDb();
  if (!db) return { totalEstimated: 0, totalActual: 0, variance: 0 };

  const result = await db
    .select({
      totalEstimated: sql<number>`COALESCE(SUM(${tasks.estimatedDays}), 0)`,
      totalActual: sql<number>`COALESCE(SUM(${tasks.workload}), 0)`,
    })
    .from(tasks)
    .where(and(eq(tasks.weekNumber, weekNumber), eq(tasks.year, year)));

  if (result.length === 0) {
    return { totalEstimated: 0, totalActual: 0, variance: 0 };
  }

  const estimated = Number(result[0].totalEstimated) || 0;
  const actual = (Number(result[0].totalActual) || 0) / 2; // Convert half-days to days
  const variance = actual - estimated;

  return {
    totalEstimated: estimated,
    totalActual: actual,
    variance,
  };
}

export async function getAnnualDataByResource(year: number) {
  const db = await getDb();
  if (!db) return [];

  // Group by resource and month
  const result = await db
    .select({
      resourceId: tasks.resourceId,
      month: sql<number>`CAST((${tasks.weekNumber} / 4.33) + 0.9999 as INTEGER) as month`,
      totalWorkload: sql<number>`COALESCE(SUM(${tasks.workload}), 0) as totalWorkload`,
      totalEstimated: sql<number>`COALESCE(SUM(${tasks.estimatedDays}), 0) as totalEstimated`,
    })
    .from(tasks)
    .where(eq(tasks.year, year))
    .groupBy(tasks.resourceId, sql`month`);

  // Convert string to number (MySQL returns DECIMAL as string)
  return result.map(r => ({
    resourceId: r.resourceId,
    month: typeof r.month === 'string' ? parseInt(r.month) : r.month,
    totalWorkload: typeof r.totalWorkload === 'string' ? parseFloat(r.totalWorkload) : r.totalWorkload,
    totalEstimated: typeof r.totalEstimated === 'string' ? parseFloat(r.totalEstimated) : r.totalEstimated,
  }));
}
