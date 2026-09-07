import { getGoalBundles, getProfile } from "@/lib/data/queries";
import { computeSummary, toGoalState, toGoalVM } from "@/lib/data/viewmodel";
import { todayISO } from "@/lib/savings/dates";
import { formatMoney } from "@/lib/savings/money";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { JoinByCode } from "@/components/profile/JoinByCode";
import { SignOutButton } from "@/components/profile/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) return null;

  const today = todayISO(profile.timezone);
  const bundles = await getGoalBundles(["active", "paused", "completed"]);
  const entries = bundles.map((b) => ({
    goal: toGoalVM(b, profile.id, today),
    state: toGoalState(b, today),
  }));
  const summary = computeSummary(entries, profile.id);
  const totalSaved = entries.reduce(
    (s, e) => s + (e.state.members[profile.id]?.saved ?? 0),
    0,
  );

  return (
    <div className="space-y-4 pt-2">
      <section className="card flex items-center gap-4 p-5">
        <Avatar
          src={profile.avatar_url}
          name={profile.full_name}
          email={profile.email}
          size={56}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.full_name ?? "Sin nombre"}</p>
          <p className="truncate text-sm text-ink-400">{profile.email}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Ahorrado", value: formatMoney(totalSaved, profile.currency) },
          { label: "Racha", value: `${summary.streak} 🔥` },
          { label: "Metas", value: `${entries.length}` },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-ink-400">{s.label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <JoinByCode />
      <ProfileSettings profile={profile} />

      <p className="px-2 text-center text-xs leading-relaxed text-ink-400">
        SavR es un simulador. No conecta con bancos ni mueve dinero real: registras tus abonos y la
        app lleva la cuenta por ti.
      </p>

      <SignOutButton />
    </div>
  );
}
