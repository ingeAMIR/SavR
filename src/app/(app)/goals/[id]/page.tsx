import Link from "next/link";
import { notFound } from "next/navigation";

import { getGoalBundle, getInvitations, getProfile } from "@/lib/data/queries";
import { toGoalVM } from "@/lib/data/viewmodel";
import { todayISO } from "@/lib/savings/dates";
import { GoalHero } from "@/components/goals/GoalHero";
import { GoalStats } from "@/components/goals/GoalStats";
import { CollaboratorsPanel } from "@/components/goals/CollaboratorsPanel";
import { ActivityFeed } from "@/components/goals/ActivityFeed";
import { AddContribution } from "@/components/goals/AddContribution";

export const dynamic = "force-dynamic";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, bundle] = await Promise.all([getProfile(), getGoalBundle(id)]);
  if (!profile) return null;
  if (!bundle) notFound();

  const today = todayISO(profile.timezone);
  const goal = toGoalVM(bundle, profile.id, today);
  const invitations = goal.isOwner ? await getInvitations(id) : [];

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-ink-400" aria-label="Volver">
          ←
        </Link>
        {goal.isOwner && (
          <Link href={`/goals/${id}/settings`} className="text-sm text-ink-400">
            Ajustes
          </Link>
        )}
      </header>

      <GoalHero goal={goal} currency={profile.currency} />
      <AddContribution goal={goal} currency={profile.currency} />
      <GoalStats goal={goal} currency={profile.currency} />
      <CollaboratorsPanel
        goal={goal}
        invitations={invitations}
        currency={profile.currency}
        meId={profile.id}
      />
      <ActivityFeed
        goalId={id}
        contributions={bundle.contributions}
        currency={profile.currency}
        meId={profile.id}
      />
    </div>
  );
}
