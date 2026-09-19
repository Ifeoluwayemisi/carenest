import { readFileSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";

// Resolves to docs/openapi.json at the repo root whether running from src/
// (tsx) or dist/ (node) — same pattern as db/migrate.ts's MIGRATIONS_DIR.
const OPENAPI_PATH = path.resolve(__dirname, "../../../../docs/openapi.json");

const DOCS_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>CareNest API Docs</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: "/docs/openapi.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis],
    });
  };
</script>
</body>
</html>`;

/**
 * Read-only API documentation — a static OpenAPI 3.0 spec (docs/openapi.json,
 * hand-written to match the real routes/schemas) rendered with Swagger UI
 * loaded from a CDN. No new dependency, no changes to any existing route's
 * registration or validation. Public (no auth): this is documentation, not
 * data — nothing sensitive is served here.
 */
export async function docsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/docs/openapi.json", async (_request, reply) => {
    const spec = readFileSync(OPENAPI_PATH, "utf8");
    reply.type("application/json").send(spec);
  });

  app.get("/docs", async (_request, reply) => {
    reply.type("text/html").send(DOCS_HTML);
  });
}
