import Link from "next/link";

import { getGoalBundles, getProfile, getWishlist } from "@/lib/data/queries";
import { computeSummary, toGoalState, toGoalVM } from "@/lib/data/viewmodel";
import { todayISO } from "@/lib/savings/dates";
import { GlobalSummary } from "@/components/home/GlobalSummary";
import { GoalCatalog } from "@/components/home/GoalCatalog";
import { PromoteWishlistPrompt } from "@/components/home/PromoteWishlistPrompt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profile, bundles] = await Promise.all([
    getProfile(),
    getGoalBundles(["active", "paused", "completed"]),
  ]);
  if (!profile) return null;

  const today = todayISO(profile.timezone);

  const entries = bundles.map((b) => ({
    goal: toGoalVM(b, profile.id, today),
    state: toGoalState(b, today),
  }));

  const summary = computeSummary(entries, profile.id);
  const goals = entries.map((e) => e.goal);
  const completedUnpurchased = goals.filter((g) => g.isComplete && !g.purchased);
  const wishlist = completedUnpurchased.length > 0 ? await getWishlist() : [];

  return (
    <div className="space-y-5 pt-2">
      <GlobalSummary
        summary={summary}
        currency={profile.currency}
        goals={goals
          .filter((g) => g.status === "active")
          .map((g) => ({ id: g.id, name: g.name }))}
      />

      {completedUnpurchased.length > 0 && (
        <PromoteWishlistPrompt
          goal={completedUnpurchased[0]}
          wishlist={wishlist.filter((w) => !w.promoted_goal_id)}
          currency={profile.currency}
        />
      )}

      {goals.length === 0 ? (
        <EmptyState />
      ) : (
        <GoalCatalog goals={goals} currency={profile.currency} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-mint-500/10 text-3xl">🐷</div>
      <div className="space-y-1">
        <h2 className="font-semibold">Aún no tienes alcancías</h2>
        <p className="text-sm text-ink-400">
          Crea tu primera meta y SavR calcula cuánto necesitas guardar cada día.
        </p>
      </div>
      <Link
        href="/goals/new"
        className="rounded-xl bg-mint-500 px-5 py-3 font-medium text-ink-950 transition active:scale-95"
      >
        Crear mi primera meta
      </Link>
    </div>
  );
}
