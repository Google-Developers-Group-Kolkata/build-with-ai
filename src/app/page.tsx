import { CheckInDashboard } from "@/components/check-in-dashboard";
import { getParticipants } from "@/lib/participants";

export default async function Home() {
  const participants = await getParticipants();

  return (
    <CheckInDashboard initialParticipants={participants} />
  );
}
