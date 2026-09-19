import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-context";
import { AppError } from "../lib/errors";
import { validate } from "../lib/validate";
import {
  confirmVisitBodySchema,
  createVisitBodySchema,
  createAudioVisitBodySchema,
  patientParamsForTimelineSchema,
  reviewVisitBodySchema,
  visitParamsSchema,
  type ConfirmVisitBody,
  type TimelineResponse,
  type Visit,
  type VisitResponse,
  type VisitTimelineEntry,
} from "../schemas/visit.schema";
import {
  confirmOrgVisit,
  createOrgVisitFromAudio,
  createOrgVisitFromTranscript,
  getOrgPatientTimeline,
  getOrgVisit,
  reviewOrgVisit,
} from "../services/visits.service";
import type { VisitRecord } from "../repositories/visits.repository";

export async function createVisitController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const body = validate(createVisitBodySchema, request.body);

  const visit = await createOrgVisitFromTranscript(auth.organizationId, auth.id, {
    patientId: body.patientId,
    transcript: body.transcript,
    visitedAt: body.visitedAt ?? new Date().toISOString(),
    notes: body.notes ?? null,
    clientGeneratedId: body.clientGeneratedId ?? null,
  });

  reply.code(201).send({ success: true, data: { visit } satisfies VisitResponse });
}

export async function createAudioVisitController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const fields: Record<string, string> = {};
  let audio: Buffer | null = null;
  let filename = "";
  let mimeType = "";

  for await (const part of request.parts()) {
    if (part.type === "file") {
      try {
        audio = await part.toBuffer();
      } catch (err) {
        if ((err as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
          throw new AppError(400, "VALIDATION_ERROR", "Audio file exceeds the maximum allowed upload size.");
        }
        throw err;
      }
      filename = part.filename ?? "";
      mimeType = part.mimetype ?? "";
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }

  const body = validate(createAudioVisitBodySchema, fields);
  if (!audio) {
    throw new AppError(400, "VALIDATION_ERROR", "Missing audio file field.");
  }

  const visit = await createOrgVisitFromAudio(auth.organizationId, auth.id, {
    patientId: body.patientId,
    visitedAt: body.visitedAt ?? new Date().toISOString(),
    notes: body.notes ?? null,
    clientGeneratedId: body.clientGeneratedId ?? null,
    audio,
    filename,
    mimeType,
  });

  reply.code(201).send({ success: true, data: { visit } satisfies VisitResponse });
}

export async function getVisitController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(visitParamsSchema, request.params);
  const visit = await getOrgVisit(auth.organizationId, params.id);
  reply.send({ success: true, data: { visit } satisfies VisitResponse });
}

export async function reviewVisitController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(visitParamsSchema, request.params);
  const body = validate(reviewVisitBodySchema, request.body);

  const visit = await reviewOrgVisit(auth.organizationId, params.id, {
    notes: body.notes,
    reviewNotes: body.reviewNotes,
  });

  reply.send({ success: true, data: { visit } satisfies VisitResponse });
}

export async function confirmVisitController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(visitParamsSchema, request.params);
  const body = validate(confirmVisitBodySchema, request.body) as ConfirmVisitBody;

  const visit = await confirmOrgVisit(auth.organizationId, auth.id, params.id, {
    confirmedJson: body.confirmedJson as unknown as Record<string, unknown>,
    reviewNotes: body.reviewNotes,
  });

  reply.send({ success: true, data: { visit } satisfies VisitResponse });
}

function toTimelineEntry(record: VisitRecord): VisitTimelineEntry {
  const ai = record.aiGeneratedJson as { summary?: { text?: string } } | null;
  return {
    id: record.id,
    visitedAt: record.visitedAt,
    status: record.status,
    aiStatus: record.aiStatus,
    summary: ai?.summary?.text ?? null,
    transcript: record.transcript,
    confirmedBy: record.confirmedBy,
    confirmedAt: record.confirmedAt,
    createdAt: record.createdAt,
  };
}

export async function patientTimelineController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(patientParamsForTimelineSchema, request.params);

  const visits = await getOrgPatientTimeline(auth.organizationId, params.id);

  const response = {
    patientId: params.id,
    visits: visits.map(toTimelineEntry),
    followUps: [] as Visit[],
  };

  reply.send({ success: true, data: response satisfies TimelineResponse });
}