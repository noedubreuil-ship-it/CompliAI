"use client";

import Image from "next/image";

/**
 * Fond hero landing — image haute qualité + dégradés EU (remplace le shader WebGL).
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=2400&q=80"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center scale-105"
      />

      {/* Teinte EU + lisibilité texte */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "linear-gradient(180deg, rgba(0,20,60,0.92) 0%, rgba(0,35,100,0.78) 45%, rgba(0,15,45,0.94) 100%)",
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(0,51,153,0.35) 0%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* Grille subtile */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Orbes lumineux animés (CSS léger) */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#003399]/30 blur-[120px] animate-pulse" />
      <div
        className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[#FFCC00]/10 blur-[100px]"
        style={{ animation: "pulse 4s ease-in-out infinite" }}
      />
    </div>
  );
}
