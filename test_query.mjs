import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { tasks } from './drizzle/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log("Testing weeklyTotals query for week 49, year 2025:");
const result = await db
  .select({
    resourceId: tasks.resourceId,
    totalWorkload: sql`SUM(${tasks.workload})`,
  })
  .from(tasks)
  .where(and(eq(tasks.weekNumber, 49), eq(tasks.year, 2025)))
  .groupBy(tasks.resourceId);

console.log("Result:", JSON.stringify(result, null, 2));

await connection.end();
