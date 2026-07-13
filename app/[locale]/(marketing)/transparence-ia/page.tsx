import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/marketing/LegalPageShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Transparence" });
  return { title: t("metaTitle"), description: t("metaDesc") };
}

export default function TransparenceIAPage() {
  const t = useTranslations("Transparence");
  const rich = {
    b: (c: ReactNode) => <strong>{c}</strong>,
    privacy: (c: ReactNode) => <a href="/legal/privacy">{c}</a>,
    mail: (c: ReactNode) => <a href="mailto:privacy@compliai.eu">{c}</a>,
  };

  return (
    <LegalPageShell title={t("title")}>
      <p>{t.rich("lastUpdated", rich)}</p>
      <p>{t("intro")}</p>

      <h2>{t("s1Title")}</h2>
      <h3>{t("s1aTitle")}</h3>
      <ul>
        <li>{t.rich("s1aModel", rich)}</li>
        <li>{t.rich("s1aUsage", rich)}</li>
        <li>{t.rich("s1aCorpus", rich)}</li>
      </ul>

      <h3>{t("s1bTitle")}</h3>
      <ul>
        <li>{t.rich("s1bModel", rich)}</li>
        <li>{t.rich("s1bUsage", rich)}</li>
      </ul>

      <h2>{t("s2Title")}</h2>
      <p>{t.rich("s2p1", rich)}</p>
      <p>{t("s2p2")}</p>

      <h2>{t("s3Title")}</h2>
      <ul>
        <li>{t("s3li1")}</li>
        <li>{t("s3li2")}</li>
        <li>{t("s3li3")}</li>
        <li>{t("s3li4")}</li>
      </ul>

      <h2>{t("s4Title")}</h2>
      <ul>
        <li>{t("s4li1")}</li>
        <li>{t("s4li2")}</li>
        <li>{t.rich("s4li3", rich)}</li>
        <li>{t.rich("s4li4", rich)}</li>
      </ul>

      <h2>{t("s5Title")}</h2>
      <p>{t("s5intro")}</p>
      <ul>
        <li>{t.rich("s5li1", rich)}</li>
        <li>{t.rich("s5li2", rich)}</li>
      </ul>
      <p>{t.rich("s5outro", rich)}</p>

      <h2>{t("s6Title")}</h2>
      <p>{t.rich("s6p1", rich)}</p>
      <p>{t("s6p2")}</p>
      <p>{t.rich("s6contact", rich)}</p>
    </LegalPageShell>
  );
}
