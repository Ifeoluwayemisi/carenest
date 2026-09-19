import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-context";
import { validate } from "../lib/validate";
import {
  createFollowUpBodySchema,
  followUpParamsSchema,
  followUpPatientParamsSchema,
  updateFollowUpBodySchema,
  type FollowUpResponse,
  type FollowUpsResponse,
} from "../schemas/follow-ups.schema";
import {
  createOrgFollowUp,
  listOrgPatientFollowUps,
  updateOrgFollowUp,
} from "../services/follow-ups.service";

export async function createFollowUpController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const body = validate(createFollowUpBodySchema, request.body);

  const followUp = await createOrgFollowUp(auth.organizationId, {
    patientId: body.patientId,
    visitId: body.visitId,
    summary: body.summary,
    dueDate: body.dueDate,
    assignedTo: body.assignedTo,
    clientGeneratedId: body.clientGeneratedId,
  });

  reply.code(201).send({ success: true, data: { followUp } satisfies FollowUpResponse });
}

export async function listPatientFollowUpsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(followUpPatientParamsSchema, request.params);

  const followUps = await listOrgPatientFollowUps(auth.organizationId, params.id);

  reply.send({ success: true, data: { followUps } satisfies FollowUpsResponse });
}

export async function updateFollowUpController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(followUpParamsSchema, request.params);
  const body = validate(updateFollowUpBodySchema, request.body);

  const followUp = await updateOrgFollowUp(auth.organizationId, params.id, {
    summary: body.summary,
    status: body.status,
    dueDate: body.dueDate,
    assignedTo: body.assignedTo,
  });

  reply.send({ success: true, data: { followUp } satisfies FollowUpResponse });
}