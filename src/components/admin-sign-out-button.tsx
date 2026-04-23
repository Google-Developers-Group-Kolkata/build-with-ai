"use client";

import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  return (
    <button
      className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/60 transition hover:border-white/50 hover:text-white"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
