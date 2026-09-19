import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors";
import { validate } from "../lib/validate";
import { loginBodySchema, type LoginResponse } from "../schemas/auth.schema";
import { login as loginUser } from "../services/auth.service";

export async function loginController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = validate(loginBodySchema, request.body);
  const result = await loginUser(body.email, body.password);
  reply.send({ success: true, data: result satisfies LoginResponse });
}

export async function meController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = request.auth;
  if (!auth) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  reply.send({ success: true, data: auth });
}