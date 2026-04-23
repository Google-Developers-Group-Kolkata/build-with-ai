import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(66,133,244,0.12),transparent_40%),linear-gradient(180deg,#0d0d0d_0%,#111111_100%)] px-4 py-10 text-[#e8eaed] sm:px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center">
        <div className="w-full rounded-4xl border border-white/10 bg-[#1a1a1a] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: '#4285F4' }}>
            Build With AI 2026
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            GDG Kolkata
          </h1>
          <p className="mt-6 text-base leading-7 text-white/60">
            Sign in with your admin credentials to access the check-in dashboard.
          </p>

          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
