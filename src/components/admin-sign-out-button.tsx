"use client";

import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  return (
    <button
      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
