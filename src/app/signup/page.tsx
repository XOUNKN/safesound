"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { describeError } from "@/lib/api";
import { signUp, toast, useStore } from "@/lib/store";
import AuthCard, { FormError } from "@/components/auth/AuthCard";
import { Button, TextField } from "@/components/ui/primitives";

export default function SignupPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await signUp({
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast(`Welcome to Resonate, ${u.displayName.split(" ")[0]}`, { tone: "success" });
      router.replace("/");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Free, and it takes about twenty seconds. Your playlists and favorites follow you everywhere."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError error={error} />
        <TextField
          label="Display name"
          name="displayName"
          autoComplete="name"
          required
          maxLength={60}
          value={form.displayName}
          onChange={set("displayName")}
          placeholder="Alex Rivera"
        />
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          required
          maxLength={24}
          value={form.username}
          onChange={set("username")}
          placeholder="alexr"
          hint="Letters, numbers, dots and underscores. 3–24 characters."
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set("email")}
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={set("password")}
          placeholder="At least 8 characters"
          hint="Stored only as a salted scrypt hash — never in plain text."
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-[0.75rem] leading-relaxed text-[var(--text-mute)]">
        Resonate stores your playlists, favorites and settings. Music itself is searched and played
        through YouTube&rsquo;s official APIs —{" "}
        <Link href="/legal" className="underline underline-offset-2">
          read how that works
        </Link>
        .
      </p>
    </AuthCard>
  );
}
