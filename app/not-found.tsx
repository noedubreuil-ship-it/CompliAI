import Link from "next/link";
import "./globals.css";

/**
 * 404 global (routes hors [locale]). Le layout racine étant un passthrough,
 * cette page rend son propre <html>/<body>. Les 404 localisés sont gérés par
 * app/[locale]/not-found.tsx.
 */
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            background: "#F5F5F7",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1D1D1F" }}>Page introuvable</h1>
          <p style={{ fontSize: "0.9rem", color: "#6E6E73", marginTop: "8px", maxWidth: "28rem" }}>
            Cette adresse n&apos;existe pas ou a été déplacée.
          </p>
          <Link href="/" style={{ marginTop: "24px", color: "#003399", fontWeight: 600 }}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </body>
    </html>
  );
}
