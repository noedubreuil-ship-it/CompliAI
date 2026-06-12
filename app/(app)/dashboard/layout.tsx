import "@/app/globals.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavbar } from "@/components/ui/dashboard-navbar";
import { DashboardMain } from "@/components/dashboard/DashboardMain";
import { ToastProvider } from "@/components/ui/toast-provider";
import { CrispChat } from "@/components/ui/CrispChat";
import { SupportFab } from "@/components/ui/SupportFab";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  return (
    <ToastProvider>
      <CrispChat />
      <SupportFab />
      <div className="flex min-h-screen flex-col bg-[#fafafa] text-neutral-900">
        <DashboardNavbar
          userEmail={user.email ?? ""}
          userName={profile?.full_name ?? ""}
          tier={profile?.subscription_tier ?? "free"}
        />

        <main className="relative flex min-h-0 flex-1 flex-col">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgb(0, 51, 153), transparent 70%)",
            }}
          />
          <DashboardMain>{children}</DashboardMain>
        </main>
      </div>
    </ToastProvider>
  );
}
