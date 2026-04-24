import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/dashboard/DashboardNav";
import AIActCountdown from "@/components/dashboard/AIActCountdown";
import NotificationBell from "@/components/dashboard/NotificationBell";
import GlobalSearch from "@/components/dashboard/GlobalSearch";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DashboardNav
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? ""}
        tier={profile?.subscription_tier ?? "free"}
      />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="border-b bg-white px-4 lg:px-6 py-2 flex items-center gap-3">
          <div className="flex-1">
            <AIActCountdown />
          </div>
          <GlobalSearch />
          <NotificationBell />
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
