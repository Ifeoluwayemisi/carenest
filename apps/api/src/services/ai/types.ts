/**
 * Public types for the AI/intelligence module.
 *
 * The Visit service (not yet implemented) is the intended caller. It should
 * depend only on these types plus `processVisit` from `./index`, not on any
 * internal file in this folder — that keeps the provider swappable and the
 * module testable as a unit.
 */

/**
 * Where a piece of structured information came from. Every fact in a
 * CareNestAiResult carries one of these so patient-reported information,
 * CHW observations, AI suggestions, and (eventually) provider-verified
 * corrections never get silently merged together.
 *
 * PROVIDER_VERIFIED is reserved for a future clinician-review step and is
 * never produced by this module — it exists in the enum now so the source
 * attribution model doesn't need a breaking change later.
 */
export type SourceType =
  | "PATIENT_REPORTED"
  | "CHW_RECORDED"
  | "AI_SUGGESTED"
  | "PROVIDER_VERIFIED";

/**
 * Minimal, intentionally loose patient framing passed to the model. This is
 * NOT the `patients` table row — the Visit service maps whatever subset of
 * patient fields it has into this shape. Everything is optional; the AI must
 * never treat context fields as facts to restate unless they are also
 * present in the transcript itself (enforced in the prompt, see prompt.ts).
 */
export interface PatientContext {
  ageYears?: number;
  gender?: string;
  /** Free-text note the CHW already has on file (e.g. known chronic conditions). */
  knownConditionsNote?: string;
}

export interface ProcessVisitInput {
  transcript: string;
  patientContext?: PatientContext;
}

export interface AttributedItem {
  text: string;
  sourceType: SourceType;
}

/**
 * The CareNest AI JSON shape. This is the AI *draft* only — it is never the
 * final visit record. The Visit service stores this as `visits.ai_generated_json`
 * and keeps it immutable; a separate human-authored `confirmed_json` is what
 * review/confirmation produces (see migrations/002_foundation_hardening.sql).
 */
export interface CareNestAiResult {
  /** AI-authored synthesis of the visit. Always AI_SUGGESTED. */
  summary: AttributedItem;
  /** Restated from the transcript only. Always PATIENT_REPORTED or CHW_RECORDED — never AI_SUGGESTED. */
  reportedConcerns: AttributedItem[];
  /** Documentation gaps the AI noticed. Always AI_SUGGESTED. */
  missingInformation: AttributedItem[];
  /** Non-clinical next-step suggestions. Always AI_SUGGESTED. */
  suggestedFollowUps: AttributedItem[];
  safety: {
    disclaimer: string;
    /** Safety-filter category names, e.g. "diagnostic_language" — present only when content was flagged (in practice, a flagged result fails validation instead of being returned, so this is normally empty; kept for future soft-flag use). */
    flags: string[];
  };
  meta: {
    model: string;
    generatedAt: string;
  };
}

export type AiErrorCode =
  | "EMPTY_TRANSCRIPT"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PARSE_FAILED"
  | "VALIDATION_FAILED"
  | "UNSAFE_CONTENT_BLOCKED";

export interface AiProcessingError {
  code: AiErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Discriminated union returned by processVisit(). Expected failure modes
 * (bad AI output, provider down, unsafe content) are returned as typed
 * values, never thrown — the caller (eventually the Visit service) decides
 * what to do, e.g. set ai_status = 'FAILED', store ai_error, and let the CHW
 * fall back to manual entry.
 */
export type ProcessVisitResult =
  | { success: true; data: CareNestAiResult }
  | { success: false; error: AiProcessingError };
