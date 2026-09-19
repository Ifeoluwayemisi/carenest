# AI/STT → Visit Integration Contract

Written for: OpenCode, when implementation reaches the Visit domain.

This document explains exactly how to integrate the existing, isolated
`services/ai` and `services/speech` modules into Visit creation. **It does
not implement the Visit feature** — no routes, controllers, repositories, or
schema changes exist for Visits yet. Everything here is a contract to build
against, verified against the modules' actual current code (not a prior
design intent).

The end-to-end flow this document covers:

```text
CHW
 ↓
Patient
 ↓
Create Visit
 ↓
Audio or Text
 ↓
STT (if audio)
 ↓
Transcript
 ↓
AI structuring
 ↓
Validation
 ↓
Draft AI result
 ↓
CHW review/edit
 ↓
CHW confirms
 ↓
Save confirmed visit
 ↓
Follow-up
 ↓
Patient timeline
```

---

## A. Request flow — calling STT

```ts
import { transcribeAudio, STT_LIMITS } from "../services/speech";

const result = await transcribeAudio({
  audio,        // Buffer — buffered upload, never written to disk
  filename,     // original upload filename (discarded after format detection — never forwarded)
  mimeType,     // e.g. "audio/webm"
  languageHint, // optional ISO-639-1 code, only if already known
});

if (!result.success) {
  // result.error.code: SttErrorCode — see Section F.
  // No visit row should exist yet at this point (see below).
  return;
}

const transcript = result.data.text;
```

- Only call this for a **voice visit**. A **text visit** (CHW typed notes) skips this entirely.
- `STT_LIMITS` (`{ maxAudioBytes, acceptedExtensions }`) is exported so the upload route can configure Fastify's multipart size limit consistently with what this module will actually accept — use it rather than hardcoding a number again.
- **No HTTP route exists yet for this.** Wiring an upload endpoint needs multipart parsing — `@fastify/multipart` is not currently a project dependency.
- `transcribeAudio` never throws for expected failure modes. It does not persist audio anywhere.

## B. AI flow — calling processVisit

```ts
import { processVisit } from "../services/ai";

const result = await processVisit({
  transcript,       // string — from STT or CHW-typed text
  patientContext,   // optional: { ageYears?, gender?, knownConditionsNote? }
});

if (!result.success) {
  // result.error.code: AiErrorCode — see Section F.
  return;
}

const aiDraft = result.data; // CareNestAiResult — store as-is in ai_generated_json
```

- `patientContext` is intentionally decoupled from the `patients` table shape — map whatever fields the Patient record has (age computed from `date_of_birth`, `gender`, etc.) into this loose shape. Do not pass raw patient rows.
- `processVisit` validates its own input (`transcript`/`patientContext` shape, transcript length) before ever calling the provider — passing something malformed (wrong types, unexpected extra fields) returns `INVALID_INPUT`, not a crash.
- Never throws for expected failure modes.

## C. Persistence — meaning of the existing columns

No schema changes are needed or proposed. `visits` (per `migrations/001_init.sql` + `002_foundation_hardening.sql`) already has everything this integration needs:

| Column | Meaning for this integration |
|---|---|
| `transcript` (`TEXT`) | The raw transcript — from STT (`result.data.text`) or CHW-typed text. Written once, at visit creation. Never rewritten by the AI step. |
| `ai_generated_json` (`JSONB`) | The **immutable AI draft** — store `result.data` (a `CareNestAiResult`) exactly as returned. Never edited by a human; a human edit produces `confirmed_json` instead, never overwrites this. |
| `ai_status` (enum `PENDING｜READY｜VALIDATED｜FAILED`) | `'PENDING'` at visit creation → `'VALIDATED'` on AI success → `'FAILED'` on AI failure. |
| `ai_validated` (`BOOLEAN`) | Redundant with `ai_status='VALIDATED'` (a known, already-flagged schema quirk). Set it `true` alongside `ai_status='VALIDATED'` to keep both in sync — do not pick one and leave the other stale. |
| `ai_error` (`TEXT`) | AI failure only. Recommended format: `` `${result.error.code}: ${result.error.message}` `` so the typed code stays visible without a schema change. |
| `ai_reviewed_at` (`TIMESTAMPTZ`) | **Naming caveat** (unchanged from the earlier handoff, still unresolved): grouped with the AI fields in the schema, not the human-review fields. Recommended interpretation: set when the AI pipeline *finishes* (success or failure) — not when a human reviews the draft. Confirm this with Rachael before relying on it for anything review-related. |
| `confirmed_json` (`JSONB`) | The **human-confirmed record**. Written only by the CHW confirmation step — never by `services/ai` or `services/speech`. Recommend preserving the same source-attribution shape (Section E) rather than flattening it, so "what the AI suggested" vs. "what the CHW confirmed" stays diffable later. |
| `status` (enum `DRAFT｜UNDER_REVIEW｜CONFIRMED`) | `'DRAFT'` at creation → `'UNDER_REVIEW'` when a CHW opens the draft → `'CONFIRMED'` at confirmation. |
| `confirmed_by`, `confirmed_at` | Set at confirmation only. |

There is **no `stt_status`/`stt_error` column**, deliberately (see Section F) — do not add one without first confirming the gap is real; the recommended flow below avoids needing it.

## D. Human review — AI output is a draft, never final

**`ai_generated_json` is a draft. It becomes part of the official record only after a CHW reviews, edits if needed, and confirms it.** This is not a UI nicety — it's the product's core safety boundary (see `AGENTS.md`: "CareNest is not a diagnostic or prescribing tool"). Concretely:

- No code path may set `visits.status = 'CONFIRMED'` directly from an AI result. Confirmation is always a distinct, CHW-initiated action.
- The confirm endpoint must accept a CHW-provided `confirmed_json`, not just "accept the AI draft as-is" — even a one-click "confirm" should copy the AI draft into `confirmed_json` explicitly at that moment (an explicit CHW action), rather than treating `ai_generated_json` itself as ever being the confirmed record.
- The confirm endpoint must work identically whether `ai_status` is `'VALIDATED'` or `'FAILED'` (Section G).

## E. Source attribution — preserving the four tags through review

Every fact in `ai_generated_json` carries one of:

- `PATIENT_REPORTED` — restated from what the patient said in the transcript.
- `CHW_RECORDED` — the CHW's own observation/note from the transcript.
- `AI_SUGGESTED` — synthesized or flagged by the AI itself (summary, missing-information gaps, follow-up suggestions). Structurally guaranteed by `services/ai`'s schema — never mislabeled as patient/CHW-reported.
- `PROVIDER_VERIFIED` — reserved for a future clinician-verification step. **Never produced by `services/ai`.** Only a future provider-review feature would stamp this.

When building `confirmed_json`, preserve this same `{ text, sourceType }` shape for every item the CHW keeps or edits, rather than collapsing everything into plain strings. If the CHW edits an AI-suggested item, keep it `AI_SUGGESTED` (it was AI-suggested, then CHW-approved) rather than silently relabeling it — the audit trail of "what the AI proposed vs. what's now official" is the whole point of the two-column (`ai_generated_json` / `confirmed_json`) design. If the Visit UI needs to represent "the CHW explicitly wrote this from scratch during review" as distinct from either the AI or the original transcript, that's a legitimate reason to extend `confirmed_json`'s schema — but that's a Visit-domain decision, not something this document mandates.

## F. Failure handling

| Failure | Source | What the Visit layer should do |
|---|---|---|
| **STT failure** | `transcribeAudio()` returns `{ success: false, error: { code: SttErrorCode, ... } }` — codes: `MISSING_AUDIO`, `UNSUPPORTED_FORMAT`, `FILE_TOO_LARGE`, `PROVIDER_NOT_CONFIGURED`, `PROVIDER_ERROR`, `PROVIDER_TIMEOUT`, `EMPTY_TRANSCRIPTION`. | **Do not create a visit row.** Return the error to the client; the CHW retries as a text visit (same endpoint, `transcript` instead of `audio`). No special "manual entry" code path — it's just the text-visit path. |
| **AI failure** | `processVisit()` returns `{ success: false, error: { code: AiErrorCode, ... } }` — codes: `INVALID_INPUT`, `EMPTY_TRANSCRIPT`, `TRANSCRIPT_TOO_LONG`, `PROVIDER_NOT_CONFIGURED`, `PROVIDER_ERROR`, `PROVIDER_TIMEOUT`, `PARSE_FAILED`, `VALIDATION_FAILED`, `UNSAFE_CONTENT_BLOCKED`. | The visit row already exists (transcript was saved before calling AI). Set `ai_status='FAILED'`, `ai_error=<code: message>`. The CHW completes/confirms the visit manually (Section G). |
| **Validation failure** (`VALIDATION_FAILED`, `PARSE_FAILED`) | AI returned unusable or malformed JSON. | Same as AI failure above — this is a subtype of it, not a separate case. Never store the malformed data anywhere. |
| **Unsafe content** (`UNSAFE_CONTENT_BLOCKED`) | AI output tripped the safety filter (diagnostic/prescriptive language or a fabricated vital). | Same as AI failure above. This is the pipeline working correctly, not an error to alarm the CHW about differently — treat it identically to any other AI failure. |
| **Provider timeout** (`PROVIDER_TIMEOUT`, either module) | Groq didn't respond within the configured timeout (STT: 30s default, AI: 20s default — both env-tunable). | Treat as that module's generic failure. Never retried automatically by either module — a retry, if wanted, is a Visit-layer decision (e.g. a "retry AI" action on a `FAILED` visit). |
| **Database failure** | Outside `services/ai`/`services/speech` — a `pool.query`/transaction error in the Visit repository. | Not something either module can help with; standard error-handling conventions apply (the existing `AppError`/error-handler pattern). Mentioned here only because the failure matrix asked for it — no module-specific guidance applies. |

Both modules **never throw** for any of their own typed failure modes — every case above is a normal `{ success: false, error }` return, not a try/catch.

## G. Manual fallback — a CHW must always be able to finish a visit

- **After an STT failure:** no visit exists yet, so "manual" is simply the text-visit path (Section F).
- **After an AI failure:** the visit row exists with its transcript intact. The confirm endpoint must **never** require `ai_status='VALIDATED'` as a precondition. A CHW must be able to write `confirmed_json` from scratch (or from their own notes) and confirm the visit even when `ai_status='FAILED'`. This is a hard requirement, not a nice-to-have: CareNest must never block a CHW from completing a visit because the AI is unavailable.

## H. Offline compatibility

The frontend owns local drafts/queueing (per `AGENTS.md` — IndexedDB, connectivity detection, pending-sync UI); the backend owns persistence, idempotency, and sync responses. The client-side lifecycle this implies:

```text
DRAFT
 ↓
SAVED_LOCALLY
 ↓
PENDING_SYNC
 ↓
SYNCING
 ↓
SYNCED
```
```text
SYNC_FAILED
 ↓
RETRY
```

**Not implemented now** — this is documentation for when the sync endpoint is built, not a spec to act on today. What's relevant to AI/STT integration specifically:

- `visits.client_generated_id` already exists, uniquely constrained per-organization (`(organization_id, client_generated_id)` — see `002_foundation_hardening.sql`). When the sync endpoint lands, an `INSERT ... ON CONFLICT (organization_id, client_generated_id) DO UPDATE` is the idempotent retry pattern already established for `patients` and `follow_ups` too — reuse it, don't invent a second idempotency concept.
- Because STT/AI happen server-side, a synced-from-offline visit needs the *same* request flow as an online one: the sync endpoint receives a transcript (the frontend either recorded text offline, or the audio itself synced up for server-side STT — a frontend/product decision outside this document's scope) and runs it through the same `transcribeAudio`/`processVisit` calls, not a separate code path.
- Both modules' timeouts (STT 30s, AI 20s) bound a single sync-retry attempt's worst case; neither module queues or defers work internally.

## I. Security boundary

- **`organizationId` must always come from the authenticated context** (`request.auth.organizationId`, per `src/middlewares/auth.ts` / `src/types/auth.ts`), never from the request body/query/params. Neither `services/ai` nor `services/speech` accepts or needs an `organizationId` at all — they are entity-agnostic by design. Scoping happens entirely in the Visit repository layer.
- **AI output must never be treated as inherently trusted.** `processVisit()` only ever returns data that passed `careNestAiResultSchema` (structural validation) and the safety-language filter — but the Visit layer must still treat `ai_generated_json` as a draft, not as ground truth, and must never let it become `confirmed_json` without an explicit CHW action (Section D).
- **AI cannot diagnose, cannot prescribe, cannot invent clinical facts.** Enforced at three layers already, verified by tests: the system prompt (`services/ai/prompt.ts`), the source-attribution schema (`services/ai/schemas.ts` — `missingInformation`/`suggestedFollowUps` can only ever be `AI_SUGGESTED`, `reportedConcerns` can only ever be `PATIENT_REPORTED`/`CHW_RECORDED`), and the output safety filter (`services/ai/safety.ts`, fail-closed). The Visit layer does not need to re-implement any of this — just don't bypass it (e.g., never construct a `CareNestAiResult`-shaped object by hand instead of getting it from `processVisit()`).
- **CHW confirmation is required** before a visit is final (Section D).
- **Raw audio is not persisted.** `services/speech` buffers audio in memory for one request and discards it — it never writes to disk or a database column. If the Visit layer is tempted to store the raw audio "just in case" (e.g., in object storage) for playback/audit, that's a new, explicit product decision requiring its own privacy/consent review — not something to add incidentally while wiring this integration.

---

## Future Visit integration checklist

- [ ] Authenticated CHW (`request.auth`, role `CHW` or `ADMIN` per the existing `authenticate`/`requireRole` preHandlers)
- [ ] Patient belongs to the same organization as `request.auth.organizationId` (never trust a client-supplied organizationId)
- [ ] Create draft visit row (`status='DRAFT'`, `ai_status='PENDING'`) only once a transcript exists
- [ ] Accept **either** `transcript` (text visit) **or** `audio` (voice visit) on the same endpoint
- [ ] If audio: call `transcribeAudio()` — on failure, stop before creating any row (Section F)
- [ ] Call `processVisit({ transcript, patientContext })` against the now-saved transcript
- [ ] Validate AI output — already done inside `processVisit()`; just branch on `result.success`
- [ ] Save AI draft: `ai_generated_json`, `ai_status`, `ai_validated`, `ai_reviewed_at`, and `ai_error` on failure (Section C)
- [ ] CHW review: `status → 'UNDER_REVIEW'`
- [ ] CHW confirmation: `confirmed_json`, `confirmed_by`, `confirmed_at`, `status → 'CONFIRMED'` — works identically regardless of `ai_status` (Section G)
- [ ] Follow-up creation from a confirmed visit (`follow_ups`, org-scoped, own `client_generated_id` uniqueness — already schema-supported)
- [ ] Patient timeline (read path over `visits`/`follow_ups`, ordered by `visited_at`)
- [ ] Offline queue (frontend-owned; backend just needs the sync endpoint eventually — Section H)
- [ ] Sync endpoint (`ON CONFLICT (organization_id, client_generated_id) DO UPDATE`, reusing the existing pattern — Section H)
- [ ] Failure handling matches Section F for every case (STT failure, AI failure, validation failure, provider timeout, database failure)
- [ ] Tests: at minimum, one integration test per row in Section F's table, plus a confirm-after-AI-failure test (Section G) and an org-scoping test (Section I)
