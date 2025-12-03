import { drizzle } from "drizzle-orm/mysql2";
import { clients } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// Delete Z_CARTO TEMPLATE
await db.delete(clients).where(eq(clients.name, "Z_CARTO TEMPLATE"));

console.log("✅ Z_CARTO TEMPLATE supprimé");
