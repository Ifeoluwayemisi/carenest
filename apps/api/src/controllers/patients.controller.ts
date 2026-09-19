import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-context";
import { validate } from "../lib/validate";
import {
  createPatientBodySchema,
  listPatientsQuerySchema,
  patientParamsSchema,
  updatePatientBodySchema,
  type CreatePatientBody,
  type PatientParams,
  type PatientResponse,
  type PatientsResponse,
} from "../schemas/patient.schema";
import {
  createOrgPatient,
  getOrgPatient,
  listOrgPatients,
  updateOrgPatient,
} from "../services/patients.service";

export async function createPatientController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const body = validate(createPatientBodySchema, request.body) as CreatePatientBody;
  const patient = await createOrgPatient(auth.organizationId, auth.id, {
    uniqueId: body.uniqueId,
    clientGeneratedId: body.clientGeneratedId,
    firstName: body.firstName,
    lastName: body.lastName,
    dateOfBirth: body.dateOfBirth,
    gender: body.gender,
    phone: body.phone,
    address: body.address,
  });
  reply.code(201).send({ success: true, data: { patient } satisfies PatientResponse });
}

export async function listPatientsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const query = validate(listPatientsQuerySchema, request.query);
  const patients = await listOrgPatients(auth.organizationId, query.search);
  reply.send({ success: true, data: { patients } satisfies PatientsResponse });
}

export async function getPatientController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(patientParamsSchema, request.params) as PatientParams;
  const patient = await getOrgPatient(auth.organizationId, params.id);
  reply.send({ success: true, data: { patient } satisfies PatientResponse });
}

export async function updatePatientController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(patientParamsSchema, request.params) as PatientParams;
  const body = validate(updatePatientBodySchema, request.body);
  const patient = await updateOrgPatient(auth.organizationId, params.id, {
    uniqueId: body.uniqueId,
    firstName: body.firstName,
    lastName: body.lastName,
    dateOfBirth: body.dateOfBirth,
    gender: body.gender,
    phone: body.phone,
    address: body.address,
  });
  reply.send({ success: true, data: { patient } satisfies PatientResponse });
}