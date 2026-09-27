import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOpenReports } from "@/lib/moderation";
import ModerationQueue from "@/components/ModerationQueue";

export default async function ModerationPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MODERATOR") {
    redirect("/login");
  }

  const reports = await getOpenReports();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-paper-100">Moderation queue</h1>
      <ModerationQueue reports={reports} />
    </div>
  );
}
