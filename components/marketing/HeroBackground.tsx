"use client";

/**
 * Fond hero landing — fait maison, sans photo externe.
 * Combine le corpus juridique défilant (substance produit) et une discrète
 * constellation d'étoiles UE (ancrage européen), sur le navy de l'app.
 */

const CORPUS_LINES = [
  "Art. 5 — Pratiques d'IA interdites",
  "Art. 6 — Systèmes à haut risque",
  "Art. 50 — Obligations de transparence",
  "Art. 53 — Modèles GPAI",
  "RGPD Art. 22 — Décision automatisée",
  "RGPD Art. 35 — Analyse d'impact",
  "DSA Art. 34 — Risques systémiques",
  "Considérant 44 — Inférence d'émotions",
  "CJUE C-634/21 — Scoring SCHUFA",
  "EDPB 05/2020 — Consentement",
  "Data Act Art. 4 — Accès aux données",
  "NIS2 Art. 21 — Mesures de sécurité",
];

// 12 étoiles de l'UE disposées en cercle (en %).
const EU_STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + 30 * Math.cos(a), y: 50 + 30 * Math.sin(a) };
});

export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#000922]">
      <style>{`
        @keyframes heroCorpusScroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
      `}</style>

      {/* Corpus juridique défilant (variante B) */}
      <div className="absolute inset-0 flex gap-10 px-6 opacity-[0.08]" aria-hidden>
        {[0, 1, 2, 3].map((col) => (
          <div
            key={col}
            className="flex-1 flex flex-col gap-4 whitespace-nowrap font-mono text-[13px] text-white"
            style={{
              animation: `heroCorpusScroll ${30 + col * 6}s linear infinite`,
              animationDirection: col % 2 ? "reverse" : "normal",
            }}
          >
            {[...CORPUS_LINES, ...CORPUS_LINES].map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        ))}
      </div>

      {/* Constellation EU discrète (variante A) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22]"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {EU_STARS.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y}) scale(0.8)`}>
            <path
              d="M0,-1.6 L0.47,-0.5 L1.6,-0.5 L0.65,0.2 L1,1.3 L0,0.6 L-1,1.3 L-0.65,0.2 L-1.6,-0.5 L-0.47,-0.5 Z"
              fill="#FFCC00"
            />
          </g>
        ))}
      </svg>

      {/* Teinte EU + lisibilité texte */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(0,51,153,0.45) 0%, transparent 65%)",
            "linear-gradient(180deg, rgba(0,9,34,0.80) 0%, rgba(0,9,34,0.55) 45%, rgba(0,9,34,0.96) 100%)",
          ].join(", "),
        }}
      />

      {/* Grille subtile */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Orbes lumineux */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#003399]/30 blur-[120px] animate-pulse" />
      <div
        className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[#FFCC00]/10 blur-[100px]"
        style={{ animation: "pulse 4s ease-in-out infinite" }}
      />
    </div>
  );
}
