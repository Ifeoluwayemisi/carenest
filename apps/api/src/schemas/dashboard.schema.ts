import { z } from "zod";
import { visitStatusSchema } from "./visit.schema";

export const recentVisitSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  patientName: z.string(),
  visitedAt: z.string(),
  chwId: z.string().uuid(),
  chwName: z.string(),
  status: visitStatusSchema,
});

export type RecentVisit = z.infer<typeof recentVisitSchema>;

export const dashboardSummarySchema = z.object({
  totalPatients: z.number().int().nonnegative(),
  totalCHWs: z.number().int().nonnegative(),
  visitsToday: z.number().int().nonnegative(),
  visitsThisWeek: z.number().int().nonnegative(),
  pendingFollowUps: z.number().int().nonnegative(),
  completedFollowUps: z.number().int().nonnegative(),
  recentVisits: z.array(recentVisitSchema),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const dashboardResponseSchema = z.object({ summary: dashboardSummarySchema });

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;