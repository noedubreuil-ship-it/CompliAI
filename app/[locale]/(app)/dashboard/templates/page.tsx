import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplatesManageClient from "./TemplatesManageClient";

export const metadata = { title: "Modèles — CompliAI" };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return <TemplatesManageClient />;
}
