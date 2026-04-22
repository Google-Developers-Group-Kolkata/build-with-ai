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
    <section className="rounded-4xl border border-white/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
        Secure Sign-In
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-stone-950">
        Admin login
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Only the credentials stored in
        <code className="mx-1 rounded bg-stone-100 px-2 py-1 text-xs">.env</code>
        can open the dashboard.
      </p>

      <form className="mt-8 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-700">
            Username
          </span>
          <input
            autoComplete="username"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-blue-500"
            onChange={(event) => setUsername(event.target.value)}
            required
            type="text"
            value={username}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-700">
            Password
          </span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-blue-500"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
