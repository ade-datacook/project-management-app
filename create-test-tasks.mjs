import { drizzle } from "drizzle-orm/mysql2";
import { tasks } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const testTasks = [
  {
    name: "Actualisation score",
    notes: "Mise à jour des KPIs mensuels",
    resourceId: 1, // Baptiste
    clientId: 1, // Aesio
    deadline: new Date("2025-07-25"),
    workload: 3, // 1.5 jours
    taskType: "recurring",
    isCompleted: false,
    weekNumber: 46,
    year: 2025,
  },
  {
    name: "Branchement flux",
    notes: "Intégration des nouveaux flux de données",
    resourceId: 2, // Lucas
    clientId: 2, // Affelou
    deadline: new Date("2025-07-18"),
    workload: 4, // 2 jours
    taskType: "oneshot",
    isCompleted: false,
    weekNumber: 46,
    year: 2025,
  },
  {
    name: "Relancher Ingrid",
    notes: "Suivi du projet Ingrid",
    resourceId: 1, // Baptiste
    clientId: 1, // Aesio
    deadline: null,
    workload: 1, // 0.5 jour
    taskType: "recurring",
    isCompleted: false,
    weekNumber: 46,
    year: 2025,
  },
  {
    name: "Déploiement score",
    notes: "Mise en production du nouveau modèle",
    resourceId: 1, // Baptiste
    clientId: 1, // Aesio
    deadline: null,
    workload: 2, // 1 jour
    taskType: "oneshot",
    isCompleted: false,
    weekNumber: 46,
    year: 2025,
  },
];

async function createTestTasks() {
  console.log("Creating test tasks...");
  for (const task of testTasks) {
    await db.insert(tasks).values(task);
  }
  console.log(`Created ${testTasks.length} test tasks!`);
  process.exit(0);
}

createTestTasks().catch(console.error);
