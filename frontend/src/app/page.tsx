"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadPaper, listPapers, searchPapers, getRecentGraphs, Paper, RecentGraph } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const FEATURES = [
    {
        icon: "🔐",
        name: "User Registration & Login",
        desc: "Secure Firebase authentication with email/password and Google sign-in",
        color: "from-violet-500 to-purple-600",
        tag: "Auth",
    },
    {
        icon: "🔬",
        name: "Research Paper Search & Import",
        desc: "Upload PDFs, import from arXiv or any URL — intelligent text extraction",
        color: "from-blue-500 to-indigo-600",
        tag: "Import",
    },
    {
        icon: "📁",
        name: "Workspace Management",
        desc: "Organize papers into workspaces for structured research workflows",
        color: "from-emerald-500 to-teal-600",
        tag: "Organize",
    },
    {
        icon: "🤖",
        name: "AI Chatbot with Context",
        desc: "RAG-powered Q&A with full paper context and conversation memory",
        color: "from-amber-500 to-orange-600",
        tag: "AI Chat",
    },
    {
        icon: "🔎",
        name: "AI Plagiarism Checker",
        desc: "Cross-reference against published research to verify originality with detailed reports",
        color: "from-red-500 to-orange-600",
        tag: "NEW",
    },
    {
        icon: "📝",
        name: "AI Peer Review Simulator",
        desc: "Simulates a full conference review with 3 expert reviewers, scores, and accept/reject decision",
        color: "from-teal-500 to-cyan-600",
        tag: "NEW",
    },
    {
        icon: "🕸️",
        name: "Interactive Knowledge Graph",
        desc: "Visualize entities, methods, datasets & their relationships as a force-directed graph",
        color: "from-purple-500 to-fuchsia-600",
        tag: "NEW",
    },
    {
        icon: "🔍",
        name: "Vector-based Semantic Search",
        desc: "Search across your papers using meaning, not just keywords",
        color: "from-cyan-500 to-blue-600",
        tag: "Search",
    },
    {
        icon: "💬",
        name: "Conversation History",
        desc: "Track all your research conversations with full message history",
        color: "from-pink-500 to-rose-600",
        tag: "History",
    },
];

const AGENTS = [
    { icon: "🔬", name: "Structured Extractor", desc: "Problem, methodology, datasets, results & limitations" },
    { icon: "💡", name: "Simplifier", desc: "Beginner, intermediate & expert explanations" },
    { icon: "🔗", name: "Related Research", desc: "Similar papers via Semantic Scholar & arXiv" },
    { icon: "🎯", name: "Gap Detector", desc: "Research gaps & improvement paths" },
    { icon: "🛠️", name: "Implementation Guide", desc: "Tech stack, architecture & roadmap" },
    { icon: "🕸️", name: "Knowledge Graph", desc: "Entity & relationship extraction into interactive graph" },
    { icon: "🔎", name: "Plagiarism Checker", desc: "Originality verification against published research" },
    { icon: "📝", name: "Peer Review", desc: "Simulated conference peer review with 3 expert reviewers" },
];

const NODE_TYPE_COLORS: Record<string, string> = {
    concept: "#818cf8", method: "#22d3ee", dataset: "#34d399",
    metric: "#fbbf24", tool: "#f472b6", finding: "#a78bfa",
};

export default function HomePage() {
    const router = useRouter();
    const { user, loading: authLoading, logout } = useAuth();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Paper[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [recentGraphs, setRecentGraphs] = useState<RecentGraph[]>([]);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [authLoading, user, router]);

    const fetchPapers = useCallback(async () => {
        try { setPapers(await listPapers()); } catch { /* */ }
    }, []);

    useEffect(() => {
        if (user) {
            fetchPapers();
            getRecentGraphs().then(setRecentGraphs).catch(() => { });
        }
    }, [fetchPapers, user]);

    const handleFileDrop = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.name.endsWith(".pdf")) { setError("Please upload a PDF file"); return; }
        setUploading(true); setError("");
        try { const paper = await uploadPaper(file); router.push(`/paper/${paper.id}`); }
        catch (e: unknown) { setError(e instanceof Error ? e.message : "Upload failed"); }
        finally { setUploading(false); }
    };

    const handleUrlSubmit = async () => {
        if (!urlInput.trim()) return;
        setUploading(true); setError("");
        try { const paper = await uploadPaper(undefined, urlInput.trim()); router.push(`/paper/${paper.id}`); }
        catch (e: unknown) { setError(e instanceof Error ? e.message : "Upload failed"); }
        finally { setUploading(false); }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) { setSearchResults(null); return; }
        setSearching(true);
        try { setSearchResults(await searchPapers(searchQuery.trim())); }
        catch { setSearchResults([]); }
        finally { setSearching(false); }
    };

    if (authLoading || !user) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-2xl animate-pulse-slow glow-text font-bold">Loading...</div>
            </main>
        );
    }

    return (
        <main className="min-h-screen">
            {/* ====== Sticky Navbar ====== */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                            R
                        </div>
                        <span className="text-lg font-bold text-white">
                            Research<span className="glow-text">Pilot</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => router.push("/workspaces")} className="nav-link">
                            <span>📁</span> Workspaces
                        </button>
                        <button onClick={() => router.push("/history")} className="nav-link">
                            <span>💬</span> History
                        </button>
                        <div className="h-5 w-px bg-white/10 mx-2" />
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-300 hidden sm:inline max-w-[120px] truncate">
                                {user.displayName || user.email}
                            </span>
                            <button
                                id="logout-btn"
                                onClick={logout}
                                className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-1"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6">
                {/* ====== Hero Section ====== */}
                <section className="pt-16 pb-12 text-center animate-slide-up">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                        AI-Powered Multi-Agent Research Platform
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black mb-6 leading-[1.1] tracking-tight">
                        <span className="text-white">Understand Any</span>
                        <br />
                        <span className="glow-text">Research Paper</span>
                        <br />
                        <span className="text-white">in Minutes</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Upload a paper and let <span className="text-indigo-300 font-semibold">8 specialized AI agents</span> extract
                        insights, find gaps, discover related work, check originality, and generate implementation guides — all automatically.
                    </p>

                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-8 mb-12 animate-slide-up-delay-1">
                        <div className="stat-card">
                            <div className="stat-value glow-text">8</div>
                            <div className="stat-label">AI Agents</div>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="stat-card">
                            <div className="stat-value glow-text">RAG</div>
                            <div className="stat-label">Powered</div>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="stat-card">
                            <div className="stat-value glow-text">∞</div>
                            <div className="stat-label">Papers</div>
                        </div>
                    </div>
                </section>

                {/* ====== Upload + Search Section ====== */}
                <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-16 animate-slide-up-delay-2">
                    {/* Upload Zone — Larger */}
                    <div className="lg:col-span-3">
                        <div
                            id="upload-zone"
                            className={`upload-zone p-8 text-center h-full flex flex-col items-center justify-center min-h-[200px] ${isDragging ? "dragging" : ""} ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files); }}
                            onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file"; input.accept = ".pdf";
                                input.onchange = (e) => handleFileDrop((e.target as HTMLInputElement).files);
                                input.click();
                            }}
                        >
                            <div className="text-5xl mb-4">{uploading ? "⏳" : "📄"}</div>
                            <p className="text-lg font-semibold text-white mb-2">
                                {uploading ? "Processing..." : "Drop your research paper here"}
                            </p>
                            <p className="text-sm text-slate-500">PDF files supported • Click or drag to upload</p>
                        </div>
                    </div>

                    {/* Right Column: URL + Search */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* URL Input */}
                        <div className="glass-card-static p-5 flex-1">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <span>🔗</span> Import from URL
                            </h3>
                            <input
                                id="url-input"
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                                placeholder="arXiv URL or ID (e.g. 2301.07041)..."
                                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm mb-3"
                                disabled={uploading}
                            />
                            <button
                                id="submit-url-btn"
                                className="btn-primary w-full text-sm py-2.5"
                                onClick={handleUrlSubmit}
                                disabled={!urlInput.trim() || uploading}
                            >
                                <span>Analyze →</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="glass-card-static p-5 flex-1">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <span>🔍</span> Semantic Search
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    id="search-input"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder="Search your papers..."
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                                />
                                <button
                                    id="search-btn"
                                    className="btn-accent px-4 text-sm py-2.5"
                                    onClick={handleSearch}
                                    disabled={searching}
                                >
                                    {searching ? "..." : "Go"}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
                    </div>
                )}

                {/* Search Results */}
                {searchResults !== null && (
                    <section className="mb-12 animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">
                                Search Results <span className="text-sm text-slate-500 font-normal ml-2">({searchResults.length} found)</span>
                            </h2>
                            <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} className="btn-ghost text-xs">Clear</button>
                        </div>
                        {searchResults.length === 0 ? (
                            <div className="glass-card-static p-8 text-center">
                                <p className="text-slate-400">No matching papers found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {searchResults.map((paper) => (
                                    <button
                                        key={paper.id}
                                        onClick={() => router.push(`/paper/${paper.id}`)}
                                        className="glass-card p-4 text-left"
                                    >
                                        <h3 className="font-semibold text-white truncate text-sm">{paper.title}</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {paper.source_type.toUpperCase()} • {new Date(paper.upload_date).toLocaleDateString()}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ====== Quick Access: Workspaces & History ====== */}
                <section className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => router.push("/workspaces")}
                            className="glass-card p-6 flex items-center gap-5 group text-left"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                📁
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors">Workspaces</h3>
                                <p className="text-sm text-slate-500">Organize papers into research collections</p>
                            </div>
                            <span className="ml-auto text-slate-600 group-hover:text-emerald-400 transition-colors text-xl">→</span>
                        </button>
                        <button
                            onClick={() => router.push("/history")}
                            className="glass-card p-6 flex items-center gap-5 group text-left"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-2xl shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                                💬
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg group-hover:text-pink-300 transition-colors">Chat History</h3>
                                <p className="text-sm text-slate-500">Review past research conversations</p>
                            </div>
                            <span className="ml-auto text-slate-600 group-hover:text-pink-400 transition-colors text-xl">→</span>
                        </button>
                    </div>
                </section>

                {/* ====== Key Features Grid ====== */}
                <section className="mb-16">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-white mb-3">
                            <span className="glow-text">Key Features</span>
                        </h2>
                        <p className="text-slate-400 text-sm">Everything you need for intelligent research analysis</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map((feature, i) => (
                            <div
                                key={i}
                                className="feature-card group"
                                style={{ animationDelay: `${i * 80}ms` }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-xl shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                        {feature.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-white text-sm">{feature.name}</h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-medium">{feature.tag}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ====== Agent Pipeline ====== */}
                <section className="mb-16">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-white mb-3">
                            <span className="glow-text">8 Specialized Agents</span>
                        </h2>
                        <p className="text-slate-400 text-sm">Each paper goes through a powerful multi-agent pipeline</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-stretch gap-3">
                        {AGENTS.map((agent, i) => (
                            <div key={i} className="flex-1 relative">
                                <div className="feature-card text-center h-full flex flex-col items-center justify-center py-6 px-4">
                                    <div className="text-3xl mb-3 group-hover:animate-float">{agent.icon}</div>
                                    <h3 className="font-bold text-white text-sm mb-1">{agent.name}</h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">{agent.desc}</p>
                                </div>
                                {i < AGENTS.length - 1 && (
                                    <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-indigo-500/40 text-lg">
                                        →
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ====== Knowledge Graph Showcase ====== */}
                {recentGraphs.length > 0 && (
                    <section className="mb-16 animate-fade-in">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-4">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-slow" />
                                NEW FEATURE
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3">
                                <span className="glow-text">Knowledge Graphs</span>
                            </h2>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                Every analyzed paper gets an interactive knowledge graph — entities, methods, datasets, and their relationships visualized in real-time
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recentGraphs.map((graph) => {
                                const typeCounts: Record<string, number> = {};
                                graph.nodes.forEach((n) => {
                                    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
                                });
                                return (
                                    <button
                                        key={graph.paper_id}
                                        onClick={() => router.push(`/paper/${graph.paper_id}`)}
                                        className="glass-card p-0 overflow-hidden text-left group"
                                    >
                                        {/* Mini Graph Canvas */}
                                        <div className="relative h-40 bg-gradient-to-b from-purple-500/5 to-transparent overflow-hidden">
                                            <svg
                                                viewBox="0 0 400 160"
                                                className="w-full h-full"
                                                preserveAspectRatio="xMidYMid meet"
                                            >
                                                {/* Edges */}
                                                {graph.edges.slice(0, 30).map((edge, i) => {
                                                    const srcIdx = graph.nodes.findIndex((n) => n.id === edge.source);
                                                    const tgtIdx = graph.nodes.findIndex((n) => n.id === edge.target);
                                                    if (srcIdx < 0 || tgtIdx < 0) return null;
                                                    const sx = 40 + ((srcIdx * 137 + 50) % 320);
                                                    const sy = 20 + ((srcIdx * 89 + 30) % 120);
                                                    const tx = 40 + ((tgtIdx * 137 + 50) % 320);
                                                    const ty = 20 + ((tgtIdx * 89 + 30) % 120);
                                                    return (
                                                        <line
                                                            key={`e${i}`}
                                                            x1={sx} y1={sy} x2={tx} y2={ty}
                                                            stroke="rgba(129,140,248,0.12)"
                                                            strokeWidth={0.5}
                                                        />
                                                    );
                                                })}
                                                {/* Nodes */}
                                                {graph.nodes.slice(0, 25).map((node, i) => {
                                                    const cx = 40 + ((i * 137 + 50) % 320);
                                                    const cy = 20 + ((i * 89 + 30) % 120);
                                                    const r = 2 + (node.importance || 5) * 0.5;
                                                    const color = NODE_TYPE_COLORS[node.type] || "#818cf8";
                                                    return (
                                                        <g key={node.id}>
                                                            <circle cx={cx} cy={cy} r={r + 3} fill={color} opacity={0.15} />
                                                            <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.8}>
                                                                <animate
                                                                    attributeName="opacity"
                                                                    values="0.6;1;0.6"
                                                                    dur={`${2 + (i % 3)}s`}
                                                                    repeatCount="indefinite"
                                                                />
                                                            </circle>
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d1220] to-transparent" />
                                        </div>

                                        {/* Info */}
                                        <div className="p-4 pt-2">
                                            <h3 className="font-semibold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">
                                                {graph.paper_title}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-slate-500">
                                                    {graph.nodes.length} entities
                                                </span>
                                                <span className="text-[10px] text-slate-600">·</span>
                                                <span className="text-[10px] text-slate-500">
                                                    {graph.edges.length} relationships
                                                </span>
                                            </div>
                                            {/* Type pills */}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {Object.entries(typeCounts).slice(0, 5).map(([type, count]) => (
                                                    <span
                                                        key={type}
                                                        className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border border-white/5"
                                                        style={{ color: NODE_TYPE_COLORS[type] || "#94a3b8" }}
                                                    >
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ backgroundColor: NODE_TYPE_COLORS[type] || "#94a3b8" }}
                                                        />
                                                        {count} {type}{count > 1 ? "s" : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ====== Recent Papers ====== */}
                {papers.length > 0 && (
                    <section className="mb-16 animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                📚 Recent Papers
                            </h2>
                            <span className="text-xs text-slate-500">{papers.length} paper(s)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {papers.map((paper) => (
                                <button
                                    key={paper.id}
                                    onClick={() => router.push(`/paper/${paper.id}`)}
                                    className="glass-card p-5 flex items-center justify-between text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate">{paper.title}</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {paper.source_type.toUpperCase()} • {new Date(paper.upload_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="ml-4 flex items-center gap-2 shrink-0">
                                        <span className={`status-dot ${paper.status}`} />
                                        <span className="text-xs text-slate-500 capitalize">{paper.status}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* ====== Footer ====== */}
                <footer className="text-center text-sm text-slate-600 pb-10 pt-4 border-t border-white/5">
                    <p>ResearchPilot by <span className="text-slate-400">StarForged</span> • Powered by <span className="glow-text font-semibold">Gemini AI</span> & RAG</p>
                </footer>
            </div>
        </main>
    );
}
