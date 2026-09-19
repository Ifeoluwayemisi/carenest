/**
 * Public entry point of the AI/intelligence module.
 *
 * The Visit service (not yet implemented) should import only from this
 * file, not from internal files in this folder — that keeps the AI provider
 * swappable and this module testable as a self-contained unit.
 *
 * Typical usage from the future Visit service:
 *
 *   import { processVisit } from "../services/ai";
 *
 *   const result = await processVisit({ transcript, patientContext });
 *   if (result.success) {
 *     // result.data: CareNestAiResult — store as visits.ai_generated_json,
 *     // set ai_status = 'VALIDATED'.
 *   } else {
 *     // result.error.code: AiErrorCode — set ai_status = 'FAILED', store
 *     // ai_error = result.error.message, let the CHW enter the visit
 *     // manually. Never throws for expected failure modes.
 *   }
 */
export { assembleAndValidate, createAiService, processVisit } from "./service";
export { createAiProvider } from "./providers";
export { AiProviderNotConfiguredError } from "./provider";
export type { AiGenerateRequest, AiProvider } from "./provider";
export {
  attributedItemSchema,
  careNestAiResultSchema,
  rawAiOutputSchema,
  sourceTypeSchema,
} from "./schemas";
export type { CareNestAiResultParsed, RawAiOutput } from "./schemas";
export type {
  AiErrorCode,
  AiProcessingError,
  AttributedItem,
  CareNestAiResult,
  PatientContext,
  ProcessVisitInput,
  ProcessVisitResult,
  SourceType,
} from "./types";
