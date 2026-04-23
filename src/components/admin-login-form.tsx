"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setErrorMessage("Invalid admin username or password.");
      return;
    }

    window.location.href = result.url || callbackUrl;
  }

  return (
    <section className="rounded-4xl border border-white/10 bg-[#1a1a1a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: '#4285F4' }}>
        Secure Sign-In
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">
        Admin login
      </h2>

      <form className="mt-8 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            Username
          </span>
          <input
            autoComplete="username"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#4285F4] focus:bg-white/10"
            onChange={(event) => setUsername(event.target.value)}
            required
            type="text"
            value={username}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            Password
          </span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#4285F4] focus:bg-white/10"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: '#4285F4' }}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
