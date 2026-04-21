import { NextResponse } from "next/server";

import { markFoodGiven } from "@/lib/participants";

type FoodPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as FoodPayload;
  const email = body.email?.trim();

  if (!email) {
    return NextResponse.json(
      { message: "An email address is required." },
      { status: 400 },
    );
  }

  const result = await markFoodGiven(email);

  if (!result.ok && result.reason === "not_found") {
    return NextResponse.json(
      { message: "No registered participant was found for that email." },
      { status: 404 },
    );
  }

  if (!result.ok && result.reason === "not_attended") {
    return NextResponse.json(
      {
        message: `${result.participant.name} has not been checked in yet. Check in first before marking food.`,
        participant: result.participant,
      },
      { status: 422 },
    );
  }

  if (!result.ok && result.reason === "already_given") {
    return NextResponse.json(
      {
        message: `Food has already been given to ${result.participant.name}.`,
        participant: result.participant,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    message: `Food marked as given for ${result.participant.name}.`,
    participant: result.participant,
  });
}
