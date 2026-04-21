import { promises as fs } from "node:fs";
import path from "node:path";

export type Participant = {
  id: string;
  name: string;
  email: string;
  company: string;
  ticketType: string;
  present: boolean;
  checkedInAt: string | null;
};

const dataFilePath = path.join(process.cwd(), "src", "data", "participants.json");

async function writeParticipants(participants: Participant[]) {
  await fs.writeFile(
    dataFilePath,
    `${JSON.stringify(participants, null, 2)}\n`,
    "utf8",
  );
}

export async function getParticipants() {
  const file = await fs.readFile(dataFilePath, "utf8");
  return JSON.parse(file) as Participant[];
}

export async function markParticipantPresent(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const participants = await getParticipants();
  const participantIndex = participants.findIndex(
    (participant) => participant.email.toLowerCase() === normalizedEmail,
  );

  if (participantIndex === -1) {
    return {
      ok: false as const,
      reason: "not_found" as const,
    };
  }

  const participant = participants[participantIndex];

  if (participant.present) {
    return {
      ok: false as const,
      reason: "already_present" as const,
      participant,
    };
  }

  const updatedParticipant: Participant = {
    ...participant,
    present: true,
    checkedInAt: new Date().toISOString(),
  };

  participants[participantIndex] = updatedParticipant;
  await writeParticipants(participants);

  return {
    ok: true as const,
    participant: updatedParticipant,
  };
}
