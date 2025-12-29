import { int, mysqlTable, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 50 }),
  role: varchar("role", { length: 20, enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Resources (team members) table
 */
export const resources = mysqlTable("resources", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  photoUrl: varchar("photoUrl", { length: 255 }),
  color: varchar("color", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

/**
 * Clients table
 */
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }).notNull().default("#808080"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Tasks table
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  notes: varchar("notes", { length: 1000 }),
  resourceId: int("resourceId").notNull(),
  clientId: int("clientId").notNull(),
  deadline: timestamp("deadline"),
  workload: int("workload").notNull().default(0), // in half-days (1 = 0.5 day, 2 = 1 day)
  estimatedDays: int("estimatedDays").default(0),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  weekNumber: int("weekNumber").notNull(),
  year: int("year").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

