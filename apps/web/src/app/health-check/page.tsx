"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, API_BASE_URL } from "@/lib/api";
import { getHealth } from "@/services/health";

type CheckState =
  | { status: "loading" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export default function HealthCheckPage() {
  const [state, setState] = useState<CheckState>({ status: "loading" });

  useEffect(() => {
    getHealth()
      .then((res) => setState({ status: "ok", message: res.message }))
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError
            ? `API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Failed to reach the API.";
        setState({ status: "error", message });
      });
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl">
        <p className="font-mono text-sm text-accent">Development health check</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Frontend to backend connectivity
        </h1>
        <p className="mt-2 text-sm text-muted">
          This page calls <code className="font-mono">GET {API_BASE_URL}/health</code> from
          the browser.
        </p>

        <dl className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm">
          <div className="flex flex-col gap-2">
            <dt className="font-medium">Backend API</dt>
            <dd className="font-mono text-muted">{API_BASE_URL}</dd>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <dt
              className={`h-2.5 w-2.5 rounded-full ${
                state.status === "ok"
                  ? "bg-emerald-500"
                  : state.status === "error"
                    ? "bg-red-500"
                    : "animate-pulse bg-zinc-400"
              }`}
            />
            <dd>
              {state.status === "loading" && "Checking…"}
              {state.status === "ok" && <span className="text-emerald-700">API is up — {state.message}</span>}
              {state.status === "error" && <span className="text-red-700">{state.message}</span>}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-xs text-muted">
          Tip: start the API with <code className="font-mono">npm run dev:api</code> and
          keep <code className="font-mono">NEXT_PUBLIC_API_URL</code> pointing at it.
        </p>

        <Link href="/" className="mt-8 inline-block text-sm font-medium text-accent hover:underline">
          Back to home
        </Link>
      </main>
    </div>
  );
}