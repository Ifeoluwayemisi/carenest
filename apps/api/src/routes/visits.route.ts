import type { FastifyInstance } from "fastify";
import {
  confirmVisitController,
  createAudioVisitController,
  createVisitController,
  getVisitController,
  patientTimelineController,
  reviewVisitController,
} from "../controllers/visits.controller";
import { authenticate, requireRole } from "../middlewares/auth";

const WRITE_ROLES = requireRole("CHW", "ADMIN");
const READ_ROLES = requireRole("CHW", "ADMIN", "SUPERVISOR");

/**
 * Visit domain — the vertical slice: create (text or voice via audio upload),
 * review/edit, confirm, and the patient timeline. Patient scoping always comes
 * from the authenticated organization. The same POST /api/v1/visits path serves
 * both content types: JSON (transcript) and multipart/form-data (audio file).
 */
export async function visitRoutes(app: FastifyInstance): Promise<void> {
  // A single route dispatches by content type at request time. Fastify has
  // no built-in "contentType" route constraint (only version/host) — two
  // app.post() calls to the same path with a `constraints: { contentType }`
  // option throw at boot ("No strategy registered for constraint key
  // contentType"), which crashes buildApp() entirely and takes down every
  // route in the app, not just this one. request.isMultipart() (from the
  // already-registered @fastify/multipart plugin) is the correct dispatch.
  app.post(
    "/api/v1/visits",
    { preHandler: [authenticate, WRITE_ROLES] },
    async (request, reply) => {
      if (request.isMultipart()) {
        return createAudioVisitController(request, reply);
      }
      return createVisitController(request, reply);
    },
  );
  app.get(
    "/api/v1/visits/:id",
    { preHandler: [authenticate, READ_ROLES] },
    getVisitController,
  );
  app.patch(
    "/api/v1/visits/:id",
    { preHandler: [authenticate, WRITE_ROLES] },
    reviewVisitController,
  );
  app.post(
    "/api/v1/visits/:id/confirm",
    { preHandler: [authenticate, WRITE_ROLES] },
    confirmVisitController,
  );
  app.get(
    "/api/v1/patients/:id/timeline",
    { preHandler: [authenticate, READ_ROLES] },
    patientTimelineController,
  );
}