import { query } from "../db/pool";

/**
 * Organization-scoped dashboard aggregates. Every query filters by
 * `organizationId` explicitly; an org always reads its own data only.
 *
 * Time windows use date_trunc on the server clock ("today" and "since the
 * start of the current week"), which is what the dashboard displays.
 */
export interface RecentVisitRecord {
  id: string;
  patientId: string;
  patientName: string;
  visitedAt: string;
  chwId: string;
  chwName: string;
  status: "DRAFT" | "UNDER_REVIEW" | "CONFIRMED";
}

export interface DashboardSummaryRecord {
  totalPatients: number;
  totalCHWs: number;
  visitsToday: number;
  visitsThisWeek: number;
  pendingFollowUps: number;
  completedFollowUps: number;
  recentVisits: RecentVisitRecord[];
}

interface CountsRow {
  total_patients: number;
  total_chws: number;
  visits_today: number;
  visits_this_week: number;
  pending_follow_ups: number;
  completed_follow_ups: number;
}

interface RecentVisitRow {
  id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  visited_at: string;
  chw_id: string;
  chw_name: string;
  visit_status: RecentVisitRecord["status"];
}

const VISITS_TODAY_SQL = `visited_at >= date_trunc('day', now())
                         AND visited_at < date_trunc('day', now()) + interval '1 day'`;
const VISITS_THIS_WEEK_SQL = `visited_at >= date_trunc('week', now())`;

export async function getDashboardSummary(
  organizationId: string,
): Promise<DashboardSummaryRecord> {
  const countsResult = await query<CountsRow>(
    `SELECT
       (SELECT count(*)::int FROM patients WHERE organization_id = $1) AS total_patients,
       (SELECT count(*)::int FROM users WHERE organization_id = $1 AND role = 'CHW') AS total_chws,
       (SELECT count(*)::int FROM visits
          WHERE organization_id = $1 AND ${VISITS_TODAY_SQL}) AS visits_today,
       (SELECT count(*)::int FROM visits
          WHERE organization_id = $1 AND ${VISITS_THIS_WEEK_SQL}) AS visits_this_week,
       (SELECT count(*)::int FROM follow_ups
          WHERE organization_id = $1 AND status = 'OPEN') AS pending_follow_ups,
       (SELECT count(*)::int FROM follow_ups
          WHERE organization_id = $1 AND status = 'COMPLETED') AS completed_follow_ups`,
    [organizationId],
  );

  const recentResult = await query<RecentVisitRow>(
    `SELECT v.id, v.patient_id,
            p.first_name AS patient_first_name,
            p.last_name AS patient_last_name,
            v.visited_at,
            v.chw_id,
            u.name AS chw_name,
            v.status AS visit_status
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       JOIN users u ON u.id = v.chw_id
      WHERE v.organization_id = $1
      ORDER BY v.visited_at DESC, v.created_at DESC
      LIMIT 5`,
    [organizationId],
  );

  const counts = countsResult.rows[0] as CountsRow;

  return {
    totalPatients: counts.total_patients,
    totalCHWs: counts.total_chws,
    visitsToday: counts.visits_today,
    visitsThisWeek: counts.visits_this_week,
    pendingFollowUps: counts.pending_follow_ups,
    completedFollowUps: counts.completed_follow_ups,
    recentVisits: recentResult.rows.map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      patientName: `${row.patient_first_name} ${row.patient_last_name}`,
      visitedAt: row.visited_at,
      chwId: row.chw_id,
      chwName: row.chw_name,
      status: row.visit_status,
    })),
  };
}