import { drizzle } from "drizzle-orm/mysql2";
import { clients } from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const realClients = [
  { name: "AESIO", color: "#B50F7C" },
  { name: "AFFELOU", color: "#A7AAAC" },
  { name: "ALICE DÉLICE", color: "#E8B4D9" },
  { name: "AUTODISTRIBUTION", color: "#C41E3A" },
  { name: "AVANCI", color: "#FFD700" },
  { name: "BESSON CHAUSSURES", color: "#8B4513" },
  { name: "BEST WESTERN", color: "#FF6B6B" },
  { name: "COGEDIM", color: "#4A90E2" },
  { name: "COSMOPARIS", color: "#FF69B4" },
  { name: "EQWIN", color: "#32CD32" },
  { name: "EURONEWS", color: "#FFD700" },
  { name: "GROUP DIGITAL", color: "#EB5A1B" },
  { name: "HARMONIE MUTUELLE", color: "#00A859" },
  { name: "HAVÉA", color: "#FF6347" },
  { name: "HIPPOPOTAMUS", color: "#8B4513" },
  { name: "MONSTER", color: "#76B900" },
  { name: "NAOS", color: "#0066CC" },
  { name: "NUTRAVALIA", color: "#228B22" },
  { name: "PSG", color: "#0B3B6A" },
  { name: "RELAIS & CHÂTEAUX", color: "#8B7355" },
  { name: "SE LOGER", color: "#FF6B35" },
  { name: "SENSEE", color: "#9B59B6" },
  { name: "SPORT 2000", color: "#E74C3C" },
  { name: "VELIGO", color: "#3498DB" },
  { name: "Z_CARTO TEMPLATE", color: "#95A5A6" },
];

async function updateClients() {
  console.log("Deleting old clients...");
  await db.delete(clients);
  
  console.log("Creating new clients...");
  for (const client of realClients) {
    await db.insert(clients).values(client);
  }
  
  console.log(`Created ${realClients.length} clients!`);
  process.exit(0);
}

updateClients().catch(console.error);
