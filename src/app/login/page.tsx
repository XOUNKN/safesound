"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { describeError } from "@/lib/api";
import { signIn, toast, useStore } from "@/lib/store";
import AuthCard, { FormError } from "@/components/auth/AuthCard";
import { Button, TextField } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await signIn(email.trim(), password);
      toast(`Welcome back, ${u.displayName.split(" ")[0]}`, { tone: "success" });
      router.replace("/");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to reach your playlists, favorites and queue wherever you are."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-[var(--accent)] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
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
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <div className="flex justify-end">
          <Link
            href="/forgot"
            className="text-[0.8125rem] text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[0.75rem] text-[var(--text-mute)]">
        You can keep browsing and playing without an account —{" "}
        <Link href="/search" className="underline underline-offset-2">
          just search
        </Link>
        .
      </p>
    </AuthCard>
  );
}
