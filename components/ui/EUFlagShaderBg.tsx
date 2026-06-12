"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════════════════════
   EU FLAG SHADER BACKGROUND
   ─ Background : atmospheric dark space (GLSL stars + radial glow)
   ─ Foreground : EU flag waving as cloth (vertex displacement + cloth lighting)
   ─ Stack      : Three.js 0.184 + raw GLSL, no post-processing deps
══════════════════════════════════════════════════════════════════════════════ */

/* ─── Background — atmospheric starfield ─────────────────────────────────── */

const BG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BG_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  varying vec2 vUv;

  /* Simple, fast hash */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv - 0.5;            /* centre at 0 */

    /* Dark deep-navy gradient */
    vec3 col = mix(
      vec3(0.0,  0.008, 0.040),     /* near-black */
      vec3(0.0,  0.030, 0.100),     /* deep navy  */
      length(uv) * 0.8
    );

    /* EU blue radial glow behind the flag */
    float glow = exp(-dot(uv, uv) * 3.2);
    col += vec3(0.0, 0.040, 0.200) * glow;

    /* ── Stars (3 density layers) ── */
    for (int i = 0; i < 3; i++) {
      float scale = 28.0 + float(i) * 22.0;
      vec2  g     = (vUv) * scale;
      vec2  id    = floor(g);
      vec2  fr    = fract(g) - 0.5;
      float h     = hash(id + float(i) * 17.3);

      if (h > 0.91) {
        float br = (h - 0.91) / 0.09;
        float tw = 0.55 + 0.45 * sin(uTime * (1.2 + h * 3.5) + h * 80.0);
        float d  = length(fr);
        col += br * tw * smoothstep(0.09, 0.0, d) * 0.55
             * vec3(0.78, 0.88, 1.00);   /* cool-white stars */
      }
    }

    /* Subtle horizon vignette */
    float vig = 1.0 - smoothstep(0.3, 0.72, length(uv));
    col      *= mix(0.55, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─── Flag — cloth wave (vertex) ─────────────────────────────────────────── */

const FLAG_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2  vUv;
  varying float vLight;

  void main() {
    vUv = uv;

    /* Wave amplitude grows left→right (pole anchors the left edge) */
    float prog = pow(uv.x, 1.35);

    /* Three octaves → natural cloth flutter */
    float w = sin(uv.x * 4.60 - uTime * 2.30) * 0.095 * prog
            + sin(uv.x * 9.20 - uTime * 3.80 + 1.10) * 0.038 * prog
            + sin(uv.x * 2.10 - uTime * 1.40 + 2.50) * 0.028 * prog;

    float wY = cos(uv.x * 3.10 - uTime * 1.85) * 0.013 * prog;

    /* ── Fake cloth normal for diffuse shading ── */
    /* dz/dx ≈ derivative of dominant wave */
    float dz = cos(uv.x * 4.60 - uTime * 2.30) * 0.095 * 4.60 * prog;
    vec3  n  = normalize(vec3(-dz, 0.0, 1.0));
    vec3  l  = normalize(vec3( 0.5, 0.7, 1.0));
    vLight   = 0.58 + 0.52 * max(dot(n, l), 0.0);

    vec3 pos = position;
    pos.z   += w;
    pos.y   += wY;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

/* ─── Flag — EU colours + 12 stars (fragment) ───────────────────────────── */

const FLAG_FRAG = /* glsl */ `
  precision highp float;
  varying vec2  vUv;
  varying float vLight;

  #define PI  3.14159265359
  #define TAU 6.28318530718

  /*
    Sector-based 5-pointed star.
    Returns 1.0 inside the star, 0.0 outside — no sign-convention trap.

    How it works:
      • The star boundary radius oscillates between outerR (at tips) and
        innerR (at inner corners) 5× per full revolution.
      • We rotate so one tip points straight up (+Y).
      • Anti-aliased with a 3-unit soft edge relative to world-height coords.
  */
  float star5(vec2 p, float outerR) {
    float innerR = outerR * 0.382; /* golden-ratio inner radius */

    /* Angle from centre; rotate -90° so 0 = up (+Y tip) */
    float a = atan(p.y, p.x) - PI * 0.5;
    a = mod(a, TAU);              /* [0, 2π) */

    /* t ∈ [0,1) within each 72° sector — 0 at tip, 0.5 at inner corner */
    float t = fract(a * 5.0 / TAU);

    /* Boundary: outerR at tips (t=0 or 1), innerR at inner corners (t=0.5) */
    float boundary = mix(innerR, outerR, abs(2.0 * t - 1.0));

    /* 1 inside, 0 outside, smooth 3-unit anti-alias edge */
    float aa = outerR * 0.06;
    return 1.0 - smoothstep(boundary - aa, boundary + aa, length(p));
  }

  void main() {
    /* ── EU official colours (exact hex) ── */
    vec3 euBlue = vec3(  0.0 / 255.0,  51.0 / 255.0, 153.0 / 255.0); /* #003399 */
    vec3 euGold = vec3(255.0 / 255.0, 204.0 / 255.0,   0.0 / 255.0); /* #FFCC00 */

    /*
      World-height coordinate system:
        x ∈ [-0.75, +0.75]   (flag 3:2 → width = 1.5 × height)
        y ∈ [-0.50, +0.50]
    */
    vec2 p = (vUv - 0.5) * vec2(1.5, 1.0);

    vec3  col  = euBlue;
    float mask = 0.0;

    /*
      EU Council specification:
        ● 12 stars on a circle of radius = H/3   → R  = 0.3333
        ● Each star outer radius         = H/18  → sr = 0.0556
        ● First star at 12 o'clock, going counter-clockwise
          → angle = +PI/2 + i * TAU/12
    */
    float R  = 1.0 / 3.0;
    float sr = 1.0 / 18.0;

    for (int i = 0; i < 12; i++) {
      /* +PI/2  → first star at top (12 o'clock, y = +R) ✓            */
      /* +i*TAU/12 → equally spaced counter-clockwise                  */
      float a  = PI * 0.5 + float(i) * TAU / 12.0;
      vec2  sc = vec2(cos(a), sin(a)) * R;   /* star centre */
      mask    += star5(p - sc, sr);
    }

    col = mix(col, euGold, clamp(mask, 0.0, 1.0));

    /* ── Cloth shading ── */
    col *= vLight;

    /* ── Edge vignette — soft fade at flag border ── */
    float vig = smoothstep(0.00, 0.04, vUv.x) * smoothstep(1.00, 0.96, vUv.x)
              * smoothstep(0.00, 0.04, vUv.y) * smoothstep(1.00, 0.96, vUv.y);
    col *= mix(0.78, 1.0, vig);

    gl_FragColor = vec4(col, 0.97);
  }
`;

/* ══════════════════════════════════════════════════════════════════════════════
   React component
══════════════════════════════════════════════════════════════════════════════ */

export default function EUFlagShaderBg() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 1);
    el.appendChild(renderer.domElement);

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(
      48,
      el.clientWidth / el.clientHeight,
      0.1,
      200,
    );
    camera.position.set(0, 0, 3.2);

    /* ── Scene ── */
    const scene = new THREE.Scene();

    /* ── Background plane (large, behind flag) ── */
    const bgUniforms = { uTime: { value: 0 } };
    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShaderMaterial({
        vertexShader:   BG_VERT,
        fragmentShader: BG_FRAG,
        uniforms:       bgUniforms,
        depthWrite:     false,
      }),
    );
    bgMesh.position.z = -4;
    bgMesh.renderOrder = 0;
    scene.add(bgMesh);

    /* ── EU flag (3:2 ratio → 1.8 × 1.2 world units) ── */
    const flagUniforms = { uTime: { value: 0 } };
    const flagMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.2, 160, 100), /* dense grid for smooth waves */
      new THREE.ShaderMaterial({
        vertexShader:   FLAG_VERT,
        fragmentShader: FLAG_FRAG,
        uniforms:       flagUniforms,
        transparent:    true,
        side:           THREE.DoubleSide,
      }),
    );
    flagMesh.position.set(0, 0, 0);
    flagMesh.renderOrder = 1;
    scene.add(flagMesh);

    /* ── Flagpole ── */
    const poleGeo  = new THREE.CylinderGeometry(0.009, 0.009, 2.5, 8);
    const poleMat  = new THREE.MeshBasicMaterial({ color: 0xb8976a });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.set(-0.9, 0.05, -0.01); /* left edge of flag, centred vertically */
    poleMesh.renderOrder = 1;
    scene.add(poleMesh);

    /* ── Very subtle camera float ── */
    let raf: number;
    let t  = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      t  += 0.0155;

      bgUniforms.uTime.value   = t;
      flagUniforms.uTime.value = t;

      /* Gentle parallax drift */
      camera.position.x = Math.sin(t * 0.18) * 0.04;
      camera.position.y = Math.cos(t * 0.14) * 0.025;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    tick();

    /* ── Resize ── */
    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── Reduced-motion: stop animation but still render one frame ── */
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      cancelAnimationFrame(raf!);
      renderer.render(scene, camera);
    }

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
