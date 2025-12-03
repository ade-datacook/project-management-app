import { drizzle } from "drizzle-orm/mysql2";
import { resources, clients } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const defaultResources = [
  { name: "Baptiste", photoUrl: null, color: "#B794F4" },
  { name: "Lucas", photoUrl: null, color: "#63B3ED" },
  { name: "Victor", photoUrl: null, color: "#A0AEC0" },
  { name: "Elodie", photoUrl: null, color: "#F6E05E" },
  { name: "Alexandre", photoUrl: null, color: "#FC8181" },
  { name: "Quentin", photoUrl: null, color: "#81E6D9" },
  { name: "Rafael", photoUrl: null, color: "#B794F4" },
];

const defaultClients = [
  { name: "Aesio" },
  { name: "Affelou" },
  { name: "Autolist" },
  { name: "Alice Del" },
  { name: "BestList" },
  { name: "Equin Group" },
  { name: "PSG" },
  { name: "Relais Cla" },
  { name: "Spot Floso" },
  { name: "Cosmo" },
  { name: "Veligo" },
  { name: "Avanci" },
];

async function seed() {
  console.log("Seeding resources...");
  for (const resource of defaultResources) {
    await db.insert(resources).values(resource).onDuplicateKeyUpdate({ set: resource });
  }
  
  console.log("Seeding clients...");
  for (const client of defaultClients) {
    await db.insert(clients).values(client).onDuplicateKeyUpdate({ set: client });
  }
  
  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch(console.error);
