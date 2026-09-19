import bcrypt from "bcrypt";
import { pool } from "./pool";

/**
 * Seeds synthetic development data only.
 *
 * Idempotent: re-running refreshes the demo users' credentials and reports the
 * organization instead of failing or duplicating rows.
 */
const DEMO_PASSWORD = "CareNestDemo!2026";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const organization = await pool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ["CareNest Demo", "carenest-demo"],
  );
  const orgId = organization.rows[0].id as string;

  const admin = await pool.query(
    `INSERT INTO users (organization_id, role, name, email, password_hash)
     VALUES ($1, 'ADMIN', 'Rachael Admin', 'admin@carenest.dev', $2)
     ON CONFLICT (lower(email)) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role
     RETURNING id`,
    [orgId, passwordHash],
  );
  const adminId = admin.rows[0].id as string;

  await pool.query(
    `INSERT INTO users (organization_id, role, name, email, password_hash)
     VALUES ($1, 'CHW', 'Amina CHW', 'amina@carenest.dev', $2),
            ($1, 'SUPERVISOR', 'Supervisor One', 'supervisor@carenest.dev', $3)
     ON CONFLICT (lower(email)) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role`,
    [orgId, passwordHash, passwordHash],
  );

  const existingPatient = await pool.query(
    `SELECT 1 FROM patients
     WHERE organization_id = $1 AND unique_id = 'PAT-0001'
     LIMIT 1`,
    [orgId],
  );

  if ((existingPatient.rowCount ?? 0) === 0) {
    const patient = await pool.query(
      `INSERT INTO patients (organization_id, unique_id, first_name, last_name, date_of_birth, gender, phone)
       VALUES ($1, 'PAT-0001', 'Fatima', 'Bello', '1985-03-12', 'female', '08012345678')
       RETURNING id`,
      [orgId],
    );

    await pool.query(
      `INSERT INTO visits (organization_id, patient_id, chw_id, visited_at, notes, status)
       VALUES ($1, $2, $3, now(), 'Synthetic demo visit — routine check-in.', 'CONFIRMED')`,
      [orgId, patient.rows[0].id as string, adminId],
    );
  }

  console.log(`Seeded synthetic data for organization 'carenest-demo' (demo password: ${DEMO_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });