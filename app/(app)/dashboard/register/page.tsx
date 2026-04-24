import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AISystemRegister from "@/components/register/AISystemRegister";

export const metadata = { title: "Registre des systèmes IA — CompliAI" };

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "free";
  const canEdit = tier === "starter" || tier === "pro" || tier === "enterprise";

  const { data: systems } = await supabase
    .from("ai_system_register")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registre des systèmes IA</h1>
        <p className="text-muted-foreground mt-1">
          L&apos;AI Act (Art. 49) impose aux déployeurs de systèmes à haut risque de tenir un registre dans la base de données EU.
          Ce registre est votre outil de conformité interne.
        </p>
      </div>

      {canEdit ? (
        <AISystemRegister initialSystems={systems ?? []} />
      ) : (
        <div className="border rounded-xl p-8 text-center bg-slate-50">
          <p className="font-medium">Fonctionnalité Starter</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Le registre des systèmes IA est disponible dès le plan Starter (49€/mois).
          </p>
          <Link href="/dashboard/upgrade">
            <Button>Passer au plan Starter</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
