import { NextResponse } from "next/server";

import { getParticipants } from "@/lib/participants";

export async function GET() {
  const participants = await getParticipants();

  return NextResponse.json({
    participants,
  });
}
