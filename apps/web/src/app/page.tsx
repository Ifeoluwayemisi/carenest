import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl">
        <p className="mb-3 font-mono text-sm text-accent">CareNest</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Care in the field, captured in words.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          An offline-first, voice-powered copilot for Community Health Workers. Record
          visits by voice or text, review AI-structured drafts, and sync when connectivity
          returns.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">How a visit flows</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted">
            <li>1. Select or create a patient</li>
            <li>2. Record the visit by voice or text</li>
            <li>3. Review and edit the AI-structured draft</li>
            <li>4. Confirm the visit and sync when online</li>
          </ol>
          <p className="mt-4 text-xs text-muted">
            AI assists — it never diagnoses. Every record is reviewed and confirmed by a
            human.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/health-check"
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Check API connectivity
          </Link>
          <span className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm text-muted">
            Product screens coming soon
          </span>
        </div>
      </main>
    </div>
  );
}