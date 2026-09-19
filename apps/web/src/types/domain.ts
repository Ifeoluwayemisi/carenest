/**
 * Real backend domain types — mirrors docs/API.md / docs/openapi.json exactly.
 * Used by every screen that talks to the real CareNest API. (`types/index.ts`
 * holds the older, mock-data shapes still used by a few out-of-scope views
 * that are no longer routed to; left alone rather than deleted.)
 */

export type UserRole = "ADMIN" | "CHW" | "SUPERVISOR";

export interface AuthUser {
  id: string;
  organizationId: string;
  role: UserRole;
  name: string;
  email: string;
  active: boolean;
}

export interface Patient {
  id: string;
  organizationId: string;
  uniqueId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  clientGeneratedId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SourceType =
  | "PATIENT_REPORTED"
  | "CHW_RECORDED"
  | "AI_SUGGESTED"
  | "PROVIDER_VERIFIED";

export interface AttributedItem {
  text: string;
  sourceType: SourceType;
}

export interface CareNestAiResult {
  summary: AttributedItem;
  reportedConcerns: AttributedItem[];
  missingInformation: AttributedItem[];
  suggestedFollowUps: AttributedItem[];
  safety?: { disclaimer: string; flags: string[] };
  meta?: { model: string; generatedAt: string };
}

export type VisitStatus = "DRAFT" | "UNDER_REVIEW" | "CONFIRMED";
export type VisitAiStatus = "PENDING" | "READY" | "VALIDATED" | "FAILED";

export interface Visit {
  id: string;
  organizationId: string;
  patientId: string;
  chwId: string;
  visitedAt: string;
  notes: string | null;
  transcript: string | null;
  aiGeneratedJson: CareNestAiResult | null;
  aiStatus: VisitAiStatus;
  aiValidated: boolean;
  aiReviewedAt: string | null;
  aiError: string | null;
  confirmedJson: CareNestAiResult | null;
  reviewNotes: string | null;
  status: VisitStatus;
  confirmedBy: string | null;
  confirmedAt: string | null;
  clientGeneratedId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  visitedAt: string;
  status: VisitStatus;
  aiStatus: VisitAiStatus;
  summary: string | null;
  transcript: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface PatientTimeline {
  patientId: string;
  visits: TimelineEntry[];
  followUps: unknown[];
}

export type FollowUpStatus = "OPEN" | "COMPLETED" | "CANCELLED";

export interface FollowUp {
  id: string;
  organizationId: string;
  patientId: string;
  visitId: string | null;
  assignedTo: string | null;
  summary: string;
  dueDate: string | null;
  status: FollowUpStatus;
  clientGeneratedId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecentVisit {
  id: string;
  patientId: string;
  patientName: string;
  visitedAt: string;
  chwId: string;
  chwName: string;
  status: VisitStatus;
}

export interface DashboardSummary {
  totalPatients: number;
  totalCHWs: number;
  visitsToday: number;
  visitsThisWeek: number;
  pendingFollowUps: number;
  completedFollowUps: number;
  recentVisits: RecentVisit[];
}
