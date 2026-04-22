import { timingSafeEqual } from "node:crypto";

import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function readAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

  if (!username || !password) {
    throw new Error(
      "Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment variables.",
    );
  }

  if (!secret) {
    throw new Error(
      "Missing NEXTAUTH_SECRET in environment variables.",
    );
  }

  return { username, password };
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Admin Credentials",
      credentials: {
        username: {
          label: "Username",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const { username, password } = readAdminCredentials();
        const submittedUsername = credentials?.username?.trim() ?? "";
        const submittedPassword = credentials?.password ?? "";

        if (
          !safeEqual(submittedUsername, username) ||
          !safeEqual(submittedPassword, password)
        ) {
          return null;
        }

        return {
          id: "single-admin",
          name: username,
        };
      },
    }),
  ],
} satisfies NextAuthOptions;

export function getAdminSession() {
  return getServerSession(authOptions);
}
