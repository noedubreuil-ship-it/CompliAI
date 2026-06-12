"use client";

import React from "react";

interface EUFlagProps {
  width?: number;
  height?: number;
  className?: string;
  opacity?: number;
}

export function EUFlagSVG({ width = 120, height = 80, className = "", opacity = 1 }: EUFlagProps) {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const r = height * 0.28;
    const cx = width / 2 + r * Math.cos(angle);
    const cy = height / 2 + r * Math.sin(angle);
    return { cx, cy };
  });

  const starSize = height * 0.065;

  function starPoints(cx: number, cy: number, r: number) {
    const points: string[] = [];
    for (let i = 0; i < 5; i++) {
      const outer = ((i * 72 - 90) * Math.PI) / 180;
      const inner = ((i * 72 - 90 + 36) * Math.PI) / 180;
      points.push(`${cx + r * Math.cos(outer)},${cy + r * Math.sin(outer)}`);
      points.push(`${cx + r * 0.4 * Math.cos(inner)},${cy + r * 0.4 * Math.sin(inner)}`);
    }
    return points.join(" ");
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity }}
    >
      <rect width={width} height={height} fill="#003399" rx="2" />
      {stars.map((star, i) => (
        <polygon
          key={i}
          points={starPoints(star.cx, star.cy, starSize)}
          fill="#FFCC00"
        />
      ))}
    </svg>
  );
}

export function FloatingEUFlag({
  width = 120,
  height = 80,
  className = "",
  animationClass = "flag-float",
  opacity = 0.9,
  style = {},
}: EUFlagProps & { animationClass?: string; style?: React.CSSProperties }) {
  return (
    <div className={`${animationClass} ${className}`} style={style}>
      {/* Flag pole */}
      <div className="relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #C8A951, #8B6914, #C8A951)",
            width: "3px",
            height: height + 40,
            top: -20,
            boxShadow: "0 0 8px rgba(200, 169, 81, 0.4)",
          }}
        />
        <div className="ml-1" style={{ marginLeft: "5px" }}>
          <EUFlagSVG width={width} height={height} opacity={opacity} />
        </div>
      </div>
    </div>
  );
}

export default EUFlagSVG;
