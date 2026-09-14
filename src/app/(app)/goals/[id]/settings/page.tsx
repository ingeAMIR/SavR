import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getGoalBundle, getProfile } from "@/lib/data/queries";
import { toGoalVM } from "@/lib/data/viewmodel";
import { todayISO } from "@/lib/savings/dates";
import { GoalForm } from "@/components/goals/GoalForm";
import { DangerZone } from "@/components/goals/DangerZone";

export default async function GoalSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, bundle] = await Promise.all([getProfile(), getGoalBundle(id)]);
  if (!profile) redirect("/login");
  if (!bundle) notFound();

  const goal = toGoalVM(bundle, profile.id, todayISO(profile.timezone));
  if (!goal.isOwner) redirect(`/goals/${id}`);

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-3">
        <Link href={`/goals/${id}`} className="text-ink-400" aria-label="Volver">
          ←
        </Link>
        <h1 className="text-xl font-semibold">Ajustes de la meta</h1>
      </header>

      <GoalForm userId={profile.id} currency={profile.currency} goal={goal} />
      <DangerZone goal={goal} />
    </div>
  );
}
