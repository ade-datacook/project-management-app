import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getClients, toggleClientActive } from "./db";
import { resetWeeklyTasks } from "./weeklyReset";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  resources: router({
    list: publicProcedure.query(async () => {
      return await db.getAllResources();
    }),
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        photoUrl: z.string().optional(),
        color: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createResource(input);
      }),
  }),

  clients: router({
    list: publicProcedure.query(async () => {
      return await getClients();
    }),
    toggleActive: publicProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        return await toggleClientActive(input.id, input.isActive);
      }),
    updateColor: publicProcedure
      .input(z.object({ id: z.number(), color: z.string() }))
      .mutation(async ({ input }) => {
        return await db.updateClientColor(input.id, input.color);
      }),
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        color: z.string().default("#808080"),
      }))
      .mutation(async ({ input }) => {
        return await db.createClient(input);
      }),
  }),

  tasks: router({
    listByWeek: publicProcedure
      .input(z.object({
        weekNumber: z.number(),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getTasksByWeek(input.weekNumber, input.year);
      }),
    
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        notes: z.string().optional(),
        resourceId: z.number(),
        clientId: z.number(),
        deadline: z.date().nullable().optional(),
        workload: z.number().default(0),
        estimatedDays: z.number().default(0),
        taskType: z.enum(["oneshot", "recurring"]).default("oneshot"),
        weekNumber: z.number(),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTask(input);
      }),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        notes: z.string().optional(),
        resourceId: z.number().optional(),
        clientId: z.number().optional(),
        deadline: z.date().nullable().optional(),
        workload: z.number().optional(),
        taskType: z.enum(["oneshot", "recurring"]).optional(),
        isCompleted: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateTask(id, updates);
      }),
    
    delete: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.deleteTask(input.id);
      }),
    
    weeklyTotals: publicProcedure
      .input(z.object({
        weekNumber: z.number(),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getWeeklyTotals(input.weekNumber, input.year);
      }),
    
    weeklyKPIs: publicProcedure
      .input(z.object({
        weekNumber: z.number(),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getWeeklyKPIs(input.weekNumber, input.year);
      }),
    
    annualData: publicProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getAnnualDataByClient(input.year);
      }),
    
    annualDataByResource: publicProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getAnnualDataByResource(input.year);
      }),
    
    resetWeek: publicProcedure
      .input(z.object({
        fromWeek: z.number(),
        fromYear: z.number(),
        toWeek: z.number(),
        toYear: z.number(),
      }))
      .mutation(async ({ input }) => {
        const count = await resetWeeklyTasks(
          input.fromWeek,
          input.fromYear,
          input.toWeek,
          input.toYear
        );
        return { success: true, count };
      }),
  }),
});

export type AppRouter = typeof appRouter;
