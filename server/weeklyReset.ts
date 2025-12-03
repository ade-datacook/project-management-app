import { getDb } from "./db";
import { tasks } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Reset tasks for a new week
 * - Copy recurring tasks to the new week with their previous workload
 * - Copy one-shot tasks to the new week with workload = 0
 */
export async function resetWeeklyTasks(fromWeek: number, fromYear: number, toWeek: number, toYear: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all NON-COMPLETED tasks from the previous week
  const previousTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.weekNumber, fromWeek),
        eq(tasks.year, fromYear),
        eq(tasks.isCompleted, false) // Only non-completed tasks
      )
    );

  // Create new tasks for the new week
  const newTasks = previousTasks.map((task) => ({
    name: task.name,
    notes: task.notes,
    resourceId: task.resourceId,
    clientId: task.clientId,
    deadline: task.deadline,
    workload: 0, // Réinitialiser la charge pour toutes les tâches dupliquées
    estimatedDays: task.estimatedDays || 0,
    isCompleted: false, // Reset completion status
    weekNumber: toWeek,
    year: toYear,
  }));

  // Insert new tasks
  if (newTasks.length > 0) {
    await db.insert(tasks).values(newTasks);
  }

  return newTasks.length;
}

/**
 * Check if we need to reset for the current week
 * This should be called on server startup or via a cron job
 */
export async function checkAndResetWeek(currentWeek: number, currentYear: number) {
  const db = await getDb();
  if (!db) {
    return false;
  }

  // Check if there are any tasks for the current week
  const existingTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.weekNumber, currentWeek), eq(tasks.year, currentYear)))
    .limit(1);

  // If no tasks exist for current week, reset from previous week
  if (existingTasks.length === 0) {
    let previousWeek = currentWeek - 1;
    let previousYear = currentYear;
    
    if (previousWeek < 1) {
      previousWeek = 52;
      previousYear = currentYear - 1;
    }

    const count = await resetWeeklyTasks(previousWeek, previousYear, currentWeek, currentYear);
    console.log(`[WeeklyReset] Created ${count} tasks for week ${currentWeek}/${currentYear}`);
    return true;
  }

  return false;
}
