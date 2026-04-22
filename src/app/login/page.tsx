import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(66,133,244,0.18),transparent_30%),linear-gradient(180deg,#f6f9ff_0%,#eef4ff_45%,#dde9ff_100%)] px-4 py-10 text-stone-950 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-4xl border border-white/70 bg-white/75 p-8 shadow-[0_24px_80px_rgba(37,99,235,0.12)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">
            Build With AI 2026
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            Admin access for the check-in console
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
            Sign in with the single admin username and password defined in your
            <code className="mx-1 rounded bg-stone-100 px-2 py-1 text-sm">.env</code>
            file to access the application.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-700">Protected UI</p>
              <p className="mt-2 text-sm text-blue-900">
                The dashboard page now requires a valid admin session.
              </p>
            </div>
            <div className="rounded-3xl bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-700">Protected APIs</p>
              <p className="mt-2 text-sm text-amber-900">
                Check-in and food endpoints reject unauthenticated requests.
              </p>
            </div>
            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-700">NextAuth</p>
              <p className="mt-2 text-sm text-emerald-900">
                Session handling uses signed JWT sessions via NextAuth.
              </p>
            </div>
          </div>
        </section>

        <AdminLoginForm />
      </div>
    </main>
  );
}
