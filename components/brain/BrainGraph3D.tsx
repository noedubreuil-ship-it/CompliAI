"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeType = "note" | "task" | "reference" | "insight" | "question";

interface BrainNode {
  id: string;
  parent_id: string | null;
  content: string;
  type: NodeType;
  tags: string[];
  is_favorite: boolean;
  is_collapsed?: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  tags: string[];
  is_favorite: boolean;
  val: number;    // size
  color: string;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ─── Color mapping ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<NodeType, string> = {
  note:      "#94a3b8",  // slate
  task:      "#60a5fa",  // blue
  reference: "#34d399",  // green
  insight:   "#fbbf24",  // amber
  question:  "#c084fc",  // purple
};

const FAVORITE_COLOR = "#f97316"; // orange

const TAG_COLORS: Record<string, string> = {
  "RGPD":         "#3b82f6",
  "AI Act":       "#8b5cf6",
  "DSA":          "#06b6d4",
  "DMA":          "#0ea5e9",
  "NIS2":         "#10b981",
  "DORA":         "#f59e0b",
  "CJUE":         "#ef4444",
  "CEDH":         "#ec4899",
  "EDPB":         "#6366f1",
  "CNIL":         "#84cc16",
  "Jurisprudence":"#f43f5e",
};

function getNodeColor(node: GraphNode): string {
  if (node.is_favorite) return FAVORITE_COLOR;
  // If node has a legal tag with a specific color, use it
  for (const tag of node.tags) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return TYPE_COLORS[node.type] ?? "#94a3b8";
}

// ─── Build graph data ─────────────────────────────────────────────────────────
function buildGraphData(nodes: BrainNode[], selectedId: string | null): GraphData {
  const graphNodes: GraphNode[] = nodes.map((n) => {
    const hasChildren = nodes.some((c) => c.parent_id === n.id);
    const childCount = nodes.filter((c) => c.parent_id === n.id).length;
    const isRoot = !n.parent_id;
    const isSelected = n.id === selectedId;

    const baseNode: GraphNode = {
      id: n.id,
      label: n.content.slice(0, 40) || "Sans titre",
      type: n.type,
      tags: n.tags,
      is_favorite: n.is_favorite,
      val: isSelected ? 8 : isRoot ? 5 : hasChildren ? 3 + Math.min(childCount, 5) : 2,
      color: "",
    };
    baseNode.color = getNodeColor(baseNode);
    if (isSelected) baseNode.color = "#ffffff";
    return baseNode;
  });

  const graphLinks: GraphLink[] = nodes
    .filter((n) => n.parent_id && nodes.some((p) => p.id === n.parent_id))
    .map((n) => ({ source: n.parent_id!, target: n.id }));

  return { nodes: graphNodes, links: graphLinks };
}

// ─── Inner graph component (renders only client-side) ─────────────────────────
function GraphInner({
  nodes,
  selectedId,
  onNodeClick,
  onNodeHover,
  hoveredId,
  width,
  height,
}: {
  nodes: BrainNode[];
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeHover: (id: string | null) => void;
  hoveredId: string | null;
  width: number;
  height: number;
}) {
  const fgRef = useRef<any>(null);
  const [ForceGraph3D, setForceGraph3D] = useState<any>(null);
  const graphData = buildGraphData(nodes, selectedId);

  useEffect(() => {
    import("react-force-graph-3d").then((mod) => {
      setForceGraph3D(() => mod.default);
    });
  }, []);

  // Auto-rotate slowly
  useEffect(() => {
    if (!fgRef.current) return;
    // Gentle auto-rotation
    let angle = 0;
    const interval = setInterval(() => {
      if (!fgRef.current) return;
      angle += 0.002;
      fgRef.current.cameraPosition({
        x: 300 * Math.sin(angle),
        z: 300 * Math.cos(angle),
      });
    }, 33);
    return () => clearInterval(interval);
  }, [ForceGraph3D]);

  // Focus selected node
  useEffect(() => {
    if (!fgRef.current || !selectedId) return;
    const node = graphData.nodes.find((n) => n.id === selectedId);
    if (node) {
      fgRef.current.cameraPosition(
        { x: (node.x ?? 0) + 100, y: (node.y ?? 0) + 20, z: (node.z ?? 0) + 150 },
        { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
        1200
      );
    }
  }, [selectedId]);

  if (!ForceGraph3D) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <ForceGraph3D
      ref={fgRef}
      width={width}
      height={height}
      graphData={graphData}
      backgroundColor="#0a0f1e"
      nodeLabel={(node: GraphNode) => `
        <div style="
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          font-size: 12px;
          font-family: Inter, sans-serif;
          max-width: 220px;
          backdrop-filter: blur(8px);
        ">
          <div style="font-weight:600;margin-bottom:4px;">${node.label}</div>
          ${node.tags.length > 0 ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${node.tags.map((t: string) => `<span style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:999px;font-size:10px;">${t}</span>`).join("")}</div>` : ""}
        </div>
      `}
      nodeColor={(node: GraphNode) => {
        if (node.id === hoveredId) return "#ffffff";
        return node.color;
      }}
      nodeVal={(node: GraphNode) => node.val}
      nodeOpacity={0.9}
      nodeResolution={16}
      linkColor={() => "rgba(148, 163, 184, 0.25)"}
      linkWidth={1}
      linkDirectionalParticles={2}
      linkDirectionalParticleSpeed={0.003}
      linkDirectionalParticleWidth={1.2}
      linkDirectionalParticleColor={() => "rgba(148,163,184,0.6)"}
      onNodeClick={(node: GraphNode) => onNodeClick(node.id)}
      onNodeHover={(node: GraphNode | null) => onNodeHover(node?.id ?? null)}
      enableNodeDrag={true}
      enableNavigationControls={true}
      showNavInfo={false}
      // Custom 3D node rendering
      nodeThreeObject={(node: GraphNode) => {
        const THREE = (window as any).THREE;
        if (!THREE) return null;

        const group = new THREE.Group();

        // Main sphere
        const isSelected = node.id === selectedId;
        const geometry = new THREE.SphereGeometry(isSelected ? 6 : 4, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: node.color,
          emissive: node.color,
          emissiveIntensity: isSelected ? 0.8 : 0.3,
          shininess: 100,
          transparent: true,
          opacity: node.id === hoveredId ? 1 : 0.85,
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Glow ring for selected/favorites
        if (isSelected || node.is_favorite) {
          const ringGeo = new THREE.TorusGeometry(isSelected ? 9 : 7, 0.8, 8, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: isSelected ? "#ffffff" : FAVORITE_COLOR,
            transparent: true,
            opacity: 0.6,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
        }

        return group;
      }}
    />
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur rounded-xl p-3 text-xs text-white/70 space-y-1.5 border border-white/10">
      <p className="font-semibold text-white/90 mb-2">Types de nœuds</p>
      {[
        { color: TYPE_COLORS.note,      label: "Note" },
        { color: TYPE_COLORS.task,      label: "Tâche" },
        { color: TYPE_COLORS.reference, label: "Référence" },
        { color: TYPE_COLORS.insight,   label: "Insight" },
        { color: TYPE_COLORS.question,  label: "Question" },
        { color: FAVORITE_COLOR,        label: "Favori ★" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
          {label}
        </div>
      ))}
      <p className="font-semibold text-white/90 mt-3 mb-1">Tags</p>
      {Object.entries(TAG_COLORS).slice(0, 5).map(([tag, color]) => (
        <div key={tag} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {tag}
        </div>
      ))}
      <p className="text-white/40 mt-2 text-[10px]">Clic : sélectionner · Drag : déplacer<br />Scroll : zoom · Clic droit : rotation</p>
    </div>
  );
}

// ─── Stats overlay ────────────────────────────────────────────────────────────
function StatsOverlay({ nodes, hoveredId }: { nodes: BrainNode[]; hoveredId: string | null }) {
  const hovered = hoveredId ? nodes.find((n) => n.id === hoveredId) : null;
  const totalLinks = nodes.filter((n) => n.parent_id).length;

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
      <div className="bg-slate-900/80 backdrop-blur rounded-xl px-4 py-2 text-xs text-white/70 border border-white/10 flex gap-4">
        <span><span className="text-white font-bold">{nodes.length}</span> nœuds</span>
        <span><span className="text-white font-bold">{totalLinks}</span> liens</span>
        <span><span className="text-white font-bold">{nodes.filter(n => n.is_favorite).length}</span> favoris</span>
      </div>
      {hovered && (
        <div className="bg-slate-900/90 backdrop-blur rounded-xl px-4 py-3 text-xs text-white border border-white/20 max-w-xs">
          <p className="font-semibold text-white text-sm mb-1">{hovered.content || "Sans titre"}</p>
          <p className="text-white/60 capitalize">{hovered.type}</p>
          {hovered.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hovered.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: TAG_COLORS[t] ? TAG_COLORS[t] + "33" : "#ffffff22", color: TAG_COLORS[t] ?? "#94a3b8", border: `1px solid ${TAG_COLORS[t] ?? "#94a3b8"}44` }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface BrainGraph3DProps {
  nodes: BrainNode[];
  selectedId: string | null;
  onNodeClick: (id: string) => void;
}

export default function BrainGraph3D({ nodes, selectedId, onNodeClick }: BrainGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(containerRef.current);
    const { width, height } = containerRef.current.getBoundingClientRect();
    setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden">
      {dimensions.width > 0 && (
        <GraphInner
          nodes={nodes}
          selectedId={selectedId}
          onNodeClick={onNodeClick}
          onNodeHover={setHoveredId}
          hoveredId={hoveredId}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}
      <Legend />
      <StatsOverlay nodes={nodes} hoveredId={hoveredId} />
    </div>
  );
}
