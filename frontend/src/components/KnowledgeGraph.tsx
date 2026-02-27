"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="text-slate-500 animate-pulse-slow">Loading graph engine...</div>
        </div>
    ),
});

/* ---------- Types ---------- */
export interface GraphNode {
    id: string;
    label: string;
    type: string;
    importance: number;
    description?: string;
    // Force graph internal fields
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

export interface GraphEdge {
    source: string | GraphNode;
    target: string | GraphNode;
    label: string;
    strength: number;
}

export interface GraphCluster {
    name: string;
    node_ids: string[];
}

export interface KnowledgeGraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    clusters?: GraphCluster[];
    summary?: string;
}

/* ---------- Color Palette ---------- */
const TYPE_COLORS: Record<string, { bg: string; glow: string; label: string }> = {
    concept: { bg: "#818cf8", glow: "rgba(129, 140, 248, 0.4)", label: "Concept" },
    method: { bg: "#22d3ee", glow: "rgba(34, 211, 238, 0.4)", label: "Method" },
    dataset: { bg: "#34d399", glow: "rgba(52, 211, 153, 0.4)", label: "Dataset" },
    metric: { bg: "#fbbf24", glow: "rgba(251, 191, 36, 0.4)", label: "Metric" },
    tool: { bg: "#f472b6", glow: "rgba(244, 114, 182, 0.4)", label: "Tool" },
    finding: { bg: "#a78bfa", glow: "rgba(167, 139, 250, 0.4)", label: "Finding" },
};

/* ---------- Component ---------- */
export default function KnowledgeGraph({ data }: { data: KnowledgeGraphData }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    // Measure container
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: Math.max(500, rect.height) });
            }
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    // Zoom to fit on load
    useEffect(() => {
        const timer = setTimeout(() => {
            if (graphRef.current) {
                graphRef.current.zoomToFit(400, 60);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [data]);

    // Build graph data for react-force-graph
    const graphData = useMemo(() => {
        if (!data?.nodes?.length) return { nodes: [], links: [] };
        const nodeIds = new Set(data.nodes.map((n) => n.id));
        return {
            nodes: data.nodes.map((n) => ({ ...n })),
            links: (data.edges || [])
                .filter((e) => {
                    const srcId = typeof e.source === "string" ? e.source : e.source?.id;
                    const tgtId = typeof e.target === "string" ? e.target : e.target?.id;
                    return srcId && tgtId && nodeIds.has(srcId) && nodeIds.has(tgtId);
                })
                .map((e) => ({
                    source: typeof e.source === "string" ? e.source : e.source?.id,
                    target: typeof e.target === "string" ? e.target : e.target?.id,
                    label: e.label,
                    strength: e.strength || 0.5,
                })),
        };
    }, [data]);

    // Get connected edges for a node
    const getNodeEdges = useCallback(
        (nodeId: string) => {
            return (data.edges || []).filter((e) => {
                const srcId = typeof e.source === "string" ? e.source : (e.source as GraphNode)?.id;
                const tgtId = typeof e.target === "string" ? e.target : (e.target as GraphNode)?.id;
                return srcId === nodeId || tgtId === nodeId;
            });
        },
        [data.edges]
    );

    // Canvas node renderer
    const paintNode = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const { x, y, label, type, importance } = node as GraphNode & { x: number; y: number };
            const colors = TYPE_COLORS[type] || TYPE_COLORS.concept;
            const radius = 3 + (importance || 5) * 0.8;
            const isHovered = hoveredNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            const isHighlighted = isHovered || isSelected;

            // Outer glow
            if (isHighlighted) {
                ctx.beginPath();
                ctx.arc(x, y, radius + 6, 0, 2 * Math.PI);
                ctx.fillStyle = colors.glow;
                ctx.fill();
            }

            // Glow ring
            ctx.beginPath();
            ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
            ctx.fillStyle = `${colors.bg}33`;
            ctx.fill();

            // Main circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isHighlighted ? colors.bg : `${colors.bg}cc`;
            ctx.fill();

            // Label
            const fontSize = Math.max(10 / globalScale, 2.5);
            ctx.font = `${isHighlighted ? "bold " : ""}${fontSize}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            // Label background
            const textWidth = ctx.measureText(label || "").width;
            const padding = 2;
            ctx.fillStyle = "rgba(10, 14, 26, 0.85)";
            ctx.fillRect(
                x - textWidth / 2 - padding,
                y + radius + 2,
                textWidth + padding * 2,
                fontSize + padding * 2
            );

            ctx.fillStyle = isHighlighted ? "#ffffff" : "#94a3b8";
            ctx.fillText(label || "", x, y + radius + 3);
        },
        [hoveredNode, selectedNode]
    );

    // Edge renderer
    const paintLink = useCallback(
        (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const start = link.source;
            const end = link.target;
            if (!start?.x || !end?.x) return;

            const isConnectedToHover =
                hoveredNode &&
                (start.id === hoveredNode.id || end.id === hoveredNode.id);

            // Line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = isConnectedToHover
                ? "rgba(129, 140, 248, 0.6)"
                : "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = isConnectedToHover ? 1.5 : 0.5;
            ctx.stroke();

            // Edge label (only when zoomed in or hovered)
            if ((globalScale > 1.5 || isConnectedToHover) && link.label) {
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;
                const fontSize = Math.max(8 / globalScale, 2);
                ctx.font = `${fontSize}px Inter, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = isConnectedToHover
                    ? "rgba(129, 140, 248, 0.8)"
                    : "rgba(100, 116, 139, 0.5)";
                ctx.fillText(link.label, midX, midY);
            }
        },
        [hoveredNode]
    );

    const activeNode = selectedNode || hoveredNode;

    return (
        <div className="space-y-4">
            {/* Summary */}
            {data.summary && (
                <div className="glass-card-accent p-5">
                    <p className="text-cyan-300 text-sm leading-relaxed">{data.summary}</p>
                </div>
            )}

            {/* Graph + Side Panel */}
            <div className="flex gap-4">
                {/* Graph Container */}
                <div
                    ref={containerRef}
                    className="flex-1 glass-card-static overflow-hidden relative"
                    style={{ height: "560px" }}
                >
                    {/* Legend */}
                    <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
                            <div
                                key={type}
                                className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 bg-[#0a0e1a]/80 backdrop-blur-sm px-2 py-1 rounded-full border border-white/5"
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: colors.bg }}
                                />
                                {colors.label}
                            </div>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="absolute top-4 right-4 z-10 text-[10px] text-slate-500 bg-[#0a0e1a]/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
                        {graphData.nodes.length} nodes · {graphData.links.length} edges
                    </div>

                    {graphData.nodes.length > 0 && (
                        <ForceGraph2D
                            ref={graphRef}
                            graphData={graphData}
                            width={dimensions.width}
                            height={560}
                            backgroundColor="rgba(0,0,0,0)"
                            nodeCanvasObject={paintNode}
                            linkCanvasObject={paintLink}
                            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                                const radius = 3 + ((node as GraphNode).importance || 5) * 0.8 + 4;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                                ctx.fillStyle = color;
                                ctx.fill();
                            }}
                            onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)}
                            onNodeClick={(node: any) =>
                                setSelectedNode((prev) =>
                                    prev?.id === (node as GraphNode).id ? null : (node as GraphNode)
                                )
                            }
                            cooldownTicks={100}
                            d3AlphaDecay={0.02}
                            d3VelocityDecay={0.3}
                            enableZoomInteraction={true}
                            enablePanInteraction={true}
                        />
                    )}
                </div>

                {/* Details Panel */}
                <div className="w-64 shrink-0">
                    <div className="glass-card-static p-5 sticky top-20 space-y-4">
                        {activeNode ? (
                            <>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    TYPE_COLORS[activeNode.type]?.bg || "#818cf8",
                                            }}
                                        />
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                            {activeNode.type}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white mb-1">
                                        {activeNode.label}
                                    </h3>
                                    {activeNode.description && (
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            {activeNode.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">Importance</span>
                                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                                            style={{
                                                width: `${(activeNode.importance || 5) * 10}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-white font-mono">
                                        {activeNode.importance}/10
                                    </span>
                                </div>
                                {/* Connected edges */}
                                <div>
                                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                                        Connections
                                    </h4>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {getNodeEdges(activeNode.id).map((edge, i) => {
                                            const srcId =
                                                typeof edge.source === "string"
                                                    ? edge.source
                                                    : edge.source?.id;
                                            const tgtId =
                                                typeof edge.target === "string"
                                                    ? edge.target
                                                    : edge.target?.id;
                                            const otherId =
                                                srcId === activeNode.id ? tgtId : srcId;
                                            const otherNode = data.nodes.find(
                                                (n) => n.id === otherId
                                            );
                                            const direction =
                                                srcId === activeNode.id ? "→" : "←";
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-1.5 text-[11px] p-1.5 rounded bg-white/[0.03] border border-white/5"
                                                >
                                                    <span className="text-indigo-400">
                                                        {direction}
                                                    </span>
                                                    <span className="text-slate-300 truncate flex-1">
                                                        {otherNode?.label || otherId}
                                                    </span>
                                                    <span className="text-slate-600 text-[9px] shrink-0">
                                                        {edge.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-2xl mb-2">🕸️</p>
                                <p className="text-xs text-slate-500">
                                    Hover or click a node to see details
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Clusters */}
                    {data.clusters && data.clusters.length > 0 && (
                        <div className="glass-card-static p-5 mt-4">
                            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">
                                Clusters
                            </h4>
                            <div className="space-y-2">
                                {data.clusters.map((cluster, i) => (
                                    <div
                                        key={i}
                                        className="p-2 rounded bg-white/[0.03] border border-white/5"
                                    >
                                        <p className="text-xs font-medium text-white mb-1">
                                            {cluster.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {cluster.node_ids.length} nodes
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
