import { pool } from "./pool";

async function main(): Promise<void> {
  const names = [
    ["Ngozi", "Umeh"],
    ["Chidi", "Okafor"],
    ["Blessing", "Eze"],
  ];

  for (const [firstName, lastName] of names) {
    const patients = await pool.query(
      `SELECT id FROM patients WHERE first_name = $1 AND last_name = $2`,
      [firstName, lastName],
    );
    for (const row of patients.rows) {
      await pool.query(`DELETE FROM follow_ups WHERE patient_id = $1`, [row.id]);
      await pool.query(`DELETE FROM visits WHERE patient_id = $1`, [row.id]);
      await pool.query(`DELETE FROM patients WHERE id = $1`, [row.id]);
      console.log("Deleted", firstName, lastName, row.id);
    }
  }
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
