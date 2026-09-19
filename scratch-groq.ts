import { config } from "dotenv";
config({ path: "apps/api/.env" });

const TRANSCRIPT =
  "I visited Grace today. She came in complaining of a headache and dizziness. Her blood pressure was 140 over 90. I advised her to rest, take her prescribed medication and return for a follow-up in one week. She also needs to be monitored for her blood pressure.";

async function main(): Promise<void> {
  const [{ createAiProvider }, { buildPrompt }, { assembleAndValidate }, { aiConfig }] =
    await Promise.all([
      import("./apps/api/src/services/ai/providers"),
      import("./apps/api/src/services/ai/prompt"),
      import("./apps/api/src/services/ai/service"),
      import("./apps/api/src/services/ai/config"),
    ]);

  const provider = createAiProvider();
  if (!provider) {
    console.log("PROVIDER_NULL (no GROQ_API_KEY?)");
    return;
  }

  const { system, user } = buildPrompt({ transcript: TRANSCRIPT, patientContext: undefined });
  console.log("MODEL:", aiConfig.model);

  let rawText: string;
  try {
    rawText = await provider.generate({ systemPrompt: system, userPrompt: user });
  } catch (err) {
    console.log("GENERATE_FAIL:", err instanceof Error ? err.message : err);
    return;
  }
  console.log("RAW:", rawText.slice(0, 1500));

  const result = assembleAndValidate(rawText, { model: aiConfig.model });
  console.log("RESULT:", JSON.stringify(result, null, 2).slice(0, 2500));
}

void main();