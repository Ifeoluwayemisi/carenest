import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-context";
import { validate } from "../lib/validate";
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userParamsSchema,
  type UserResponse,
  type UsersResponse,
} from "../schemas/user.schema";
import {
  createCHW,
  getOrgUser,
  listOrgUsers,
  setOrgUserActive,
  updateOrgUser,
} from "../services/users.service";

export async function createUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const body = validate(createUserBodySchema, request.body);
  const user = await createCHW(auth.organizationId, {
    name: body.name,
    email: body.email,
    password: body.password,
    phone: body.phone ?? null,
  });
  reply.code(201).send({ success: true, data: { user } satisfies UserResponse });
}

export async function listUsersController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const query = validate(listUsersQuerySchema, request.query);
  const users = await listOrgUsers(auth.organizationId, query.role);
  reply.send({ success: true, data: { users } satisfies UsersResponse });
}

export async function getUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(userParamsSchema, request.params);
  const user = await getOrgUser(auth.organizationId, params.id);
  reply.send({ success: true, data: { user } satisfies UserResponse });
}

export async function updateUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(userParamsSchema, request.params);
  const body = validate(updateUserBodySchema, request.body);
  const user = await updateOrgUser(auth.organizationId, params.id, {
    name: body.name,
    email: body.email,
    phone: body.phone,
    password: body.password,
  });
  reply.send({ success: true, data: { user } satisfies UserResponse });
}

export async function deactivateUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(userParamsSchema, request.params);
  const user = await setOrgUserActive(auth.organizationId, params.id, false, auth.id);
  reply.send({ success: true, data: { user } satisfies UserResponse });
}

export async function reactivateUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = requireAuth(request);
  const params = validate(userParamsSchema, request.params);
  const user = await setOrgUserActive(auth.organizationId, params.id, true, auth.id);
  reply.send({ success: true, data: { user } satisfies UserResponse });
}