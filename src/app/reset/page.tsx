"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import { toast } from "@/lib/store";
import AuthCard, { FormError } from "@/components/auth/AuthCard";
import { Button, TextField } from "@/components/ui/primitives";

export default function ResetPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [done, setDone] = useState(false);

  // Read after mount: keeps this page statically renderable, no Suspense needed.
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError({ message: "Those passwords don't match." });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.put("/api/auth/reset", { token, password });
      setDone(true);
      toast("Password updated — sign in with your new one", { tone: "success" });
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (token === null) {
    return (
      <AuthCard title="Reset your password">
        <p className="text-sm text-[var(--text-dim)]">Checking your link…</p>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard
        title="That link is incomplete"
        subtitle="Reset links need a token. Request a fresh one and use the whole link."
      >
        <Link href="/forgot">
          <Button variant="primary" size="lg" className="w-full">
            Request a new link
          </Button>
        </Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        subtitle="Every other session has been signed out. Taking you to sign in…"
      >
        <Link href="/login">
          <Button variant="primary" size="lg" className="w-full">
            Go to sign in
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Links expire an hour after they're created.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError error={error} />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
