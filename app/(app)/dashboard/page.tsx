import { redirect } from "next/navigation";

/** Accueil app : le consultant chat est la page par défaut (style Claude / ChatGPT). */
export default function DashboardHomePage() {
  redirect("/dashboard/chat");
}
