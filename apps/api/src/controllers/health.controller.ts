import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate";
import { healthResponseSchema, type HealthResponse } from "../schemas/health.schema";

export async function getHealth(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body: HealthResponse = {
    success: true,
    message: "CareNest API is running",
  };

  // Validate our own contract before sending it — mirrors how every endpoint
  // validates inputs and outputs with Zod.
  reply.send(validate(healthResponseSchema, body));
}