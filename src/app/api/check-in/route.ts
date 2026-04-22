import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { markParticipantPresent } from "@/lib/participants";

type CheckInPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CheckInPayload;
  const email = body.email?.trim();

  if (!email) {
    return NextResponse.json(
      { message: "An email address is required." },
      { status: 400 },
    );
  }

  const result = await markParticipantPresent(email);

  if (!result.ok && result.reason === "not_found") {
    return NextResponse.json(
      { message: "No registered participant was found for that email." },
      { status: 404 },
    );
  }

  if (!result.ok && result.reason === "already_present") {
    return NextResponse.json(
      {
        message: `${result.participant.name} has already been marked present.`,
        participant: result.participant,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    message: `${result.participant.name} is now marked present.`,
    participant: result.participant,
  });
}
