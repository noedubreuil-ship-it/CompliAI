"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  path: string;
  wordCount: number;
  isPinned: boolean;
  linkCount: number;
  updatedAt: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface KnowledgeGraphProps {
  activeNoteId?: string;
  onNodeClick?: (id: string) => void;
}

// ─── Color helpers ─────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  rgpd: "#4A9EFF",
  "ai-act": "#7C6AF7",
  dma: "#4ADE80",
  dsa: "#FB923C",
  projet: "#4A9EFF",
  personne: "#F472B6",
  concept: "#4ADE80",
  ressource: "#FACC15",
  juridique: "#7C6AF7",
  référence: "#2DD4BF",
};

function getNodeColor(node: GraphNode, activeId?: string): string {
  if (node.id === activeId) return "#A89BFF";
  if (node.isPinned) return "#FACC15";
  for (const tag of node.tags) {
    const c = TAG_COLORS[tag.toLowerCase()];
    if (c) return c;
  }
  return "#555555";
}

export default function KnowledgeGraph({ activeNoteId, onNodeClick }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  // ── Fetch graph data ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      const res = await fetch("/api/brain/graph");
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      }
      setLoading(false);
    }
    fetchGraph();
  }, []);

  // ── D3 Graph ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || loading) return;
    if (nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Filter nodes/edges by tag
    const visibleNodes = filterTag
      ? nodes.filter((n) => n.tags.includes(filterTag))
      : nodes;
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(typeof e.source === "string" ? e.source : e.source.id) &&
             visibleNodeIds.has(typeof e.target === "string" ? e.target : e.target.id)
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "rgba(124,106,247,0.4)");

    // Zoom
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Clone nodes to avoid mutation issues
    const simNodes: GraphNode[] = visibleNodes.map((n) => ({ ...n }));
    const simEdges = visibleEdges.map((e) => ({ ...e }));

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force("link", d3.forceLink<GraphNode, GraphEdge>(simEdges)
        .id((d) => d.id)
        .distance((d: any) => {
          const src = d.source as GraphNode;
          const tgt = d.target as GraphNode;
          return 80 + (src.linkCount + tgt.linkCount) * 5;
        })
      )
      .force("charge", d3.forceManyBody<GraphNode>().strength((d) => -120 - d.linkCount * 15))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius((d) => getNodeRadius(d) + 8));

    simulationRef.current = simulation;

    // Edges
    const link = g.append("g").attr("class", "links")
      .selectAll("line")
      .data(simEdges)
      .enter()
      .append("line")
      .attr("stroke", "rgba(124,106,247,0.15)")
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#arrowhead)");

    // Nodes group
    const node = g.append("g").attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(simNodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Glow effect for active node
    const defs = svg.select("defs");
    defs.append("filter")
      .attr("id", "glow")
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");

    // Circles
    node.append("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d, activeNoteId))
      .attr("fill-opacity", (d) => d.id === activeNoteId ? 1 : 0.75)
      .attr("stroke", (d) => d.id === activeNoteId ? "#A89BFF" : "rgba(255,255,255,0.1)")
      .attr("stroke-width", (d) => d.id === activeNoteId ? 2.5 : 1)
      .style("filter", (d) => d.id === activeNoteId ? "url(#glow)" : "none");

    // Labels
    node.append("text")
      .text((d) => d.title.length > 22 ? d.title.slice(0, 22) + "…" : d.title)
      .attr("x", (d) => getNodeRadius(d) + 5)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, system-ui")
      .attr("fill", (d) => d.id === activeNoteId ? "#C9B8FF" : "#666")
      .style("pointer-events", "none");

    // Hover & click
    node
      .on("mouseenter", function (_, d) {
        d3.select(this).select("circle")
          .transition().duration(120)
          .attr("fill-opacity", 1)
          .attr("r", getNodeRadius(d) + 3);
        link
          .style("stroke", (l: any) =>
            l.source.id === d.id || l.target.id === d.id
              ? "rgba(124,106,247,0.7)"
              : "rgba(124,106,247,0.1)"
          )
          .style("stroke-width", (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 2 : 1
          );
        const el = (d3.select(this).node() as SVGElement).getBoundingClientRect();
        setTooltip({ node: d, x: el.right + 8, y: el.top });
      })
      .on("mouseleave", function (_, d) {
        d3.select(this).select("circle")
          .transition().duration(120)
          .attr("fill-opacity", d.id === activeNoteId ? 1 : 0.75)
          .attr("r", getNodeRadius(d));
        link.style("stroke", "rgba(124,106,247,0.15)").style("stroke-width", 1);
        setTooltip(null);
      })
      .on("click", (_, d) => onNodeClick?.(d.id));

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x ?? 0)
        .attr("y1", (d: any) => d.source.y ?? 0)
        .attr("x2", (d: any) => d.target.x ?? 0)
        .attr("y2", (d: any) => d.target.y ?? 0);
      node.attr("transform", (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Initial zoom to fit
    simulation.on("end", () => {
      const bounds = (g.node() as SVGGElement)?.getBBox();
      if (bounds) {
        const dx = bounds.width, dy = bounds.height;
        const x = bounds.x + dx / 2, y = bounds.y + dy / 2;
        const scale = Math.min(0.9 / Math.max(dx / width, dy / height), 2);
        svg.transition().duration(600).call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2 - scale * x, height / 2 - scale * y).scale(scale)
        );
      }
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, loading, activeNoteId, filterTag, onNodeClick]);

  function getNodeRadius(d: GraphNode) {
    return Math.max(5, Math.min(22, 5 + d.linkCount * 2.5));
  }

  // All unique tags
  const allTags = Array.from(new Set(nodes.flatMap((n) => n.tags))).sort();

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ background: "#0A0A0A" }}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#444" }}>
          Filtrer par tag
        </div>
        <button
          onClick={() => setFilterTag(null)}
          className="px-2 py-1 rounded text-[10px] transition-colors"
          style={{
            background: !filterTag ? "rgba(124,106,247,0.25)" : "rgba(255,255,255,0.05)",
            color: !filterTag ? "#A89BFF" : "#666",
          }}
        >
          Toutes ({nodes.length})
        </button>
        {allTags.slice(0, 10).map((tag) => (
          <button key={tag}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            className="px-2 py-1 rounded text-[10px] text-left transition-colors"
            style={{
              background: filterTag === tag ? `${TAG_COLORS[tag.toLowerCase()] ?? "#7C6AF7"}30` : "rgba(255,255,255,0.05)",
              color: filterTag === tag ? (TAG_COLORS[tag.toLowerCase()] ?? "#7C6AF7") : "#666",
            }}
          >
            #{tag} ({nodes.filter((n) => n.tags.includes(tag)).length})
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 rounded-lg p-2 text-[10px]"
        style={{ background: "rgba(0,0,0,0.6)", color: "#555", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="mb-1 font-semibold" style={{ color: "#444" }}>Légende</div>
        {Object.entries(TAG_COLORS).slice(0, 6).map(([tag, color]) => (
          <div key={tag} className="flex items-center gap-1.5 py-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span>{tag}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 py-0.5 mt-1 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#A89BFF" }} />
          <span>Note active</span>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-3 right-3 z-10 text-[10px]" style={{ color: "#444" }}>
        {nodes.length} notes · {edges.length} connexions
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full h-full" style={{ background: "#0A0A0A" }} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg px-3 py-2 text-xs"
          style={{
            top: tooltip.y,
            left: tooltip.x,
            background: "#1E1E1E",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            color: "#DCDCDC",
            maxWidth: "200px",
          }}
        >
          <div className="font-medium mb-1" style={{ color: "#F0F0F0" }}>{tooltip.node.title}</div>
          <div style={{ color: "#888" }}>{tooltip.node.path}</div>
          {tooltip.node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tooltip.node.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px]"
                  style={{ background: `${TAG_COLORS[t] ?? "#555"}25`, color: TAG_COLORS[t] ?? "#888" }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1.5 pt-1.5 border-t text-[10px]"
            style={{ borderColor: "rgba(255,255,255,0.06)", color: "#555" }}>
            {tooltip.node.linkCount} connexion{tooltip.node.linkCount !== 1 ? "s" : ""} ·{" "}
            {tooltip.node.wordCount} mots
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2" style={{ color: "#555" }}>
            <div className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: "#333", borderTopColor: "#7C6AF7" }} />
            <span className="text-sm">Chargement du graphe…</span>
          </div>
        </div>
      )}

      {!loading && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-2">🕸️</div>
            <p className="text-sm" style={{ color: "#555" }}>Aucune note à afficher</p>
            <p className="text-xs mt-1" style={{ color: "#333" }}>Créez des notes et liez-les avec [[WikiLinks]]</p>
          </div>
        </div>
      )}
    </div>
  );
}
