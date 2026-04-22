import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { getParticipants } from "@/lib/participants";

export async function GET() {
  const session = await getAdminSession();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const participants = await getParticipants();

  return NextResponse.json({
    participants,
  });
}
