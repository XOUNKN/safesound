"use client";

import Link from "next/link";
import { useState } from "react";
import { api, describeError } from "@/lib/api";
import AuthCard, { FormError } from "@/components/auth/AuthCard";
import { Button, TextField } from "@/components/ui/primitives";

type Result = { message: string; devLink?: string };

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<Result>("/api/auth/reset", { email: email.trim() });
      setResult(res);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email on your account and we'll generate a one-hour reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5">
            <p className="text-[0.875rem] leading-relaxed text-[var(--text)]">{result.message}</p>
          </div>

          {result.devLink ? (
            <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3.5">
              <p className="text-[0.75rem] font-semibold tracking-wide text-[var(--accent)] uppercase">
                Development mode
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
                Because this server is running in development, the link is shown here instead of
                being emailed:
              </p>
              <a
                href={result.devLink}
                className="mt-2.5 block break-all text-[0.8125rem] font-medium text-[var(--accent)] underline underline-offset-2"
              >
                {result.devLink}
              </a>
            </div>
          ) : (
            <p className="text-[0.8125rem] leading-relaxed text-[var(--text-mute)]">
              No mail transport is configured on this deployment, so the link was written to the
              server log. Ask whoever runs this server for it, or check the console output.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError error={error} />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
