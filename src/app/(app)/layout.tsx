import { redirect } from "next/navigation";

import { getProfile } from "@/lib/data/queries";
import { BottomNav } from "@/components/shell/BottomNav";
import { TopBar } from "@/components/shell/TopBar";
import { RealtimeRefresher } from "@/components/shell/RealtimeRefresher";
import { ReminderScheduler } from "@/components/shell/ReminderScheduler";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import { ProfileProvider } from "@/components/shell/ProfileProvider";
import { todayISO } from "@/lib/savings/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <ProfileProvider profile={profile} today={todayISO(profile.timezone)}>
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <TopBar profile={profile} />
        <main className="flex-1 px-4 pb-28">{children}</main>
        <BottomNav />
      </div>
      <RealtimeRefresher userId={profile.id} />
      <ReminderScheduler />
      <ServiceWorker />
    </ProfileProvider>
  );
}
