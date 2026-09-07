import Link from "next/link";
import { redirect } from "next/navigation";

import { getProfile } from "@/lib/data/queries";
import { GoalForm } from "@/components/goals/GoalForm";

export default async function NewGoalPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-ink-400" aria-label="Volver">
          ←
        </Link>
        <h1 className="text-xl font-semibold">Nueva meta</h1>
      </header>

      <GoalForm userId={profile.id} currency={profile.currency} />
    </div>
  );
}
