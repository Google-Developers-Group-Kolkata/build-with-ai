import { CheckInDashboard } from "@/components/check-in-dashboard";
import { getAdminSession } from "@/lib/auth";
import { getParticipants } from "@/lib/participants";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getAdminSession();

  if (!session?.user) {
    redirect("/login");
  }

  const participants = await getParticipants();

  return (
    <CheckInDashboard
      adminName={session.user.name ?? "Admin"}
      initialParticipants={participants}
    />
  );
}
