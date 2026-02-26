"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadPaper, listPapers, Paper } from "@/lib/api";

const AGENTS = [
    {
        icon: "🔬",
        name: "Structured Extractor",
        desc: "Extracts problem statement, methodology, datasets, results & limitations",
    },
    {
        icon: "💡",
        name: "Simplifier",
        desc: "Generates beginner, intermediate & expert-level explanations",
    },
    {
        icon: "🔗",
        name: "Related Research",
        desc: "Finds similar papers via Semantic Scholar & arXiv APIs",
    },
    {
        icon: "🎯",
        name: "Gap Detector",
        desc: "Identifies research gaps, unexplored areas & improvement paths",
    },
    {
        icon: "🛠️",
        name: "Implementation Guide",
        desc: "Suggests tech stack, architecture & prototype roadmap",
    },
];

export default function HomePage() {
    const router = useRouter();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    const [error, setError] = useState("");

    const fetchPapers = useCallback(async () => {
        try {
            const data = await listPapers();
            setPapers(data);
        } catch {
            // backend may not be running
        }
    }, []);

    useEffect(() => {
        fetchPapers();
    }, [fetchPapers]);

    const handleFileDrop = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.name.endsWith(".pdf")) {
            setError("Please upload a PDF file");
            return;
        }
        setUploading(true);
        setError("");
        try {
            const paper = await uploadPaper(file);
            router.push(`/paper/${paper.id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleUrlSubmit = async () => {
        if (!urlInput.trim()) return;
        setUploading(true);
        setError("");
        try {
            const paper = await uploadPaper(undefined, urlInput.trim());
            router.push(`/paper/${paper.id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <main className="min-h-screen p-6">
            {/* Header */}
            <nav className="flex items-center justify-between max-w-7xl mx-auto mb-16">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                        R
                    </div>
                    <span className="text-xl font-bold text-slate-800">
                        Research<span className="glow-text">Pilot</span>
                    </span>
                </div>
                <div className="text-sm text-slate-400">by StarForged</div>
            </nav>

            {/* Hero */}
            <section className="text-center max-w-4xl mx-auto mb-20 animate-slide-up">
                <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-sm font-medium mb-6">
                    🚀 AI-Powered Research Intelligence
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight text-slate-900">
                    Understand Any Research
                    <br />
                    <span className="glow-text">Paper in Minutes</span>
                </h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
                    Upload a paper and let 5 specialized AI agents extract insights, find
                    gaps, discover related work, and generate implementation guides —
                    automatically.
                </p>
            </section>

            {/* Upload Zone */}
            <section className="max-w-2xl mx-auto mb-20 animate-slide-up">
                <div
                    id="upload-zone"
                    className={`glass-card p-10 text-center cursor-pointer transition-all ${isDragging
                            ? "border-indigo-400 bg-indigo-50 scale-[1.02]"
                            : ""
                        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleFileDrop(e.dataTransfer.files);
                    }}
                    onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf";
                        input.onchange = (e) =>
                            handleFileDrop((e.target as HTMLInputElement).files);
                        input.click();
                    }}
                >
                    <div className="text-5xl mb-4">{uploading ? "⏳" : "📄"}</div>
                    <p className="text-lg font-semibold text-slate-800 mb-2">
                        {uploading
                            ? "Processing..."
                            : "Drop your research paper here"}
                    </p>
                    <p className="text-sm text-slate-400">
                        PDF files supported • Click or drag to upload
                    </p>
                </div>

                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm text-slate-400">or enter a URL / arXiv ID</span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="flex gap-3">
                    <input
                        id="url-input"
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                        placeholder="Paste arXiv URL, ID (e.g. 2301.07041), or paper URL..."
                        className="flex-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                        disabled={uploading}
                    />
                    <button
                        id="submit-url-btn"
                        className="btn-primary px-6"
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim() || uploading}
                    >
                        Analyze →
                    </button>
                </div>

                {error && (
                    <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
                )}
            </section>

            {/* Agent Cards */}
            <section className="max-w-6xl mx-auto mb-20">
                <h2 className="text-2xl font-bold text-center mb-10 text-slate-800">
                    <span className="glow-text">5 Specialized Agents</span> Working for You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
                    {AGENTS.map((agent, i) => (
                        <div
                            key={i}
                            className="glass-card p-6 text-center group hover:scale-105 transition-transform"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="text-4xl mb-3 group-hover:animate-float">
                                {agent.icon}
                            </div>
                            <h3 className="font-semibold text-slate-800 text-sm mb-2">
                                {agent.name}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {agent.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Recent Papers */}
            {papers.length > 0 && (
                <section className="max-w-4xl mx-auto mb-20">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Recent Papers</h2>
                    <div className="space-y-3">
                        {papers.map((paper) => (
                            <button
                                key={paper.id}
                                onClick={() => router.push(`/paper/${paper.id}`)}
                                className="glass-card w-full p-5 flex items-center justify-between text-left hover:scale-[1.01] transition-transform"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-800 truncate">
                                        {paper.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {paper.source_type.toUpperCase()} •{" "}
                                        {new Date(paper.upload_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="ml-4 flex items-center gap-2">
                                    <span
                                        className={`status-dot ${paper.status}`}
                                    />
                                    <span className="text-xs text-slate-500 capitalize">
                                        {paper.status}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="text-center text-sm text-slate-400 pb-8">
                ResearchPilot by StarForged • Powered by Gemini AI & RAG
            </footer>
        </main>
    );
}
