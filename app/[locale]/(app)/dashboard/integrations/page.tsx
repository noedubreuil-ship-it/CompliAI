import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IntegrationsPageClient from "./IntegrationsPageClient";

export const metadata = { title: "Intégrations — CompliAI" };

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();

  const tier = profile?.subscription_tier ?? "free";
  const canIntegrations = tier === "starter" || tier === "pro" || tier === "enterprise";
  if (!canIntegrations) {
    redirect("/dashboard/upgrade");
  }

  return <IntegrationsPageClient />;
}
