"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPaper, analyzeSSE, Paper, AgentProgress } from "@/lib/api";

const AGENT_META: Record<string, { icon: string; label: string }> = {
    rag_indexer: { icon: "📦", label: "RAG Indexer" },
    structured_extractor: { icon: "🔬", label: "Structured Extractor" },
    simplifier: { icon: "💡", label: "Simplifier" },
    related_research: { icon: "🔗", label: "Related Research" },
    gap_detector: { icon: "🎯", label: "Gap Detector" },
    implementation_guide: { icon: "🛠️", label: "Implementation Guide" },
    pipeline: { icon: "✅", label: "Pipeline" },
};

const TABS = [
    { key: "structured_extractor", label: "Extraction", icon: "🔬" },
    { key: "simplifier", label: "Simplified", icon: "💡" },
    { key: "related_research", label: "Related Work", icon: "🔗" },
    { key: "gap_detector", label: "Gaps", icon: "🎯" },
    { key: "implementation_guide", label: "Implementation", icon: "🛠️" },
];

export default function PaperPage() {
    const params = useParams();
    const router = useRouter();
    const paperId = params.id as string;

    const [paper, setPaper] = useState<Paper | null>(null);
    const [activeTab, setActiveTab] = useState("structured_extractor");
    const [agentStatus, setAgentStatus] = useState<Record<string, AgentProgress>>({});
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);

    const fetchPaper = useCallback(async () => {
        try {
            const data = await getPaper(paperId);
            setPaper(data);
            if (data.analyses && Object.keys(data.analyses).length > 0) {
                // Only mark as complete if at least one analysis succeeded
                const hasCompleted = Object.values(data.analyses).some(
                    (a) => a.status === "completed"
                );
                setAnalysisComplete(hasCompleted);
            }
        } catch {
            /* ignore */
        }
    }, [paperId]);

    useEffect(() => {
        fetchPaper();
    }, [fetchPaper]);

    const startAnalysis = () => {
        setAnalyzing(true);
        setAnalysisComplete(false);
        setAgentStatus({});
        analyzeSSE(
            paperId,
            (event) => {
                setAgentStatus((prev) => ({ ...prev, [event.agent]: event }));
            },
            () => {
                setAnalyzing(false);
                setAnalysisComplete(true);
                fetchPaper();
            },
            (err) => {
                setAnalyzing(false);
                console.error(err);
            }
        );
    };

    const activeResult = paper?.analyses?.[activeTab]?.result;

    return (
        <main className="min-h-screen p-6">
            {/* Header */}
            <nav className="flex items-center justify-between max-w-7xl mx-auto mb-8">
                <button
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <span>←</span>
                    <span className="text-xl font-bold text-slate-800">
                        Research<span className="glow-text">Pilot</span>
                    </span>
                </button>
                <button
                    onClick={() => router.push(`/paper/${paperId}/chat`)}
                    className="btn-accent text-sm"
                >
                    💬 Ask Questions
                </button>
            </nav>

            {/* Paper Info */}
            {paper && (
                <section className="max-w-7xl mx-auto mb-8 animate-slide-up">
                    <div className="glass-card p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                    {paper.title}
                                </h1>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs font-medium">
                                        {paper.source_type.toUpperCase()}
                                    </span>
                                    {paper.text_length && (
                                        <span>{(paper.text_length / 1000).toFixed(1)}k chars</span>
                                    )}
                                    <span>
                                        Uploaded{" "}
                                        {new Date(paper.upload_date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            {!analyzing && (
                                <button
                                    id="analyze-btn"
                                    className="btn-primary"
                                    onClick={startAnalysis}
                                >
                                    {analysisComplete ? "🔄 Re-analyze" : "🚀 Analyze Paper"}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <div className="max-w-7xl mx-auto flex gap-6">
                {/* Agent Progress Sidebar */}
                <aside className="w-64 shrink-0">
                    <div className="glass-card p-5 sticky top-6">
                        <h2 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">
                            Research Brain
                        </h2>
                        <div className="space-y-3">
                            {Object.keys(AGENT_META).map((key) => {
                                const meta = AGENT_META[key];
                                const status = agentStatus[key]?.status;
                                const analysisStatus =
                                    paper?.analyses?.[key]?.status;
                                const displayStatus = status || analysisStatus || "pending";

                                return (
                                    <div
                                        key={key}
                                        className="flex items-center gap-3 text-sm"
                                    >
                                        <span
                                            className={`status-dot ${displayStatus}`}
                                        />
                                        <span className="text-lg">{meta.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-700 text-xs font-medium truncate">
                                                {meta.label}
                                            </p>
                                            {status && (
                                                <p className="text-slate-400 text-[10px] truncate">
                                                    {agentStatus[key]?.detail}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <section className="flex-1 min-w-0">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                    ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Results */}
                    <div className="animate-slide-up">
                        {!analysisComplete && !analyzing && (() => {
                            const hasErrors = paper?.analyses && Object.values(paper.analyses).some(a => a.status === "error");
                            const firstError = hasErrors ? Object.values(paper!.analyses!).find(a => a.error)?.error : null;
                            return (
                                <div className="glass-card p-12 text-center">
                                    <p className="text-4xl mb-4">{hasErrors ? "⚠️" : "🔬"}</p>
                                    <p className="text-lg text-slate-700 mb-2">
                                        {hasErrors ? "Analysis failed — ready to retry" : "Ready to analyze"}
                                    </p>
                                    {firstError && (
                                        <p className="text-sm text-red-500 mb-3 max-w-lg mx-auto">
                                            {firstError.length > 200 ? firstError.substring(0, 200) + "..." : firstError}
                                        </p>
                                    )}
                                    <p className="text-sm text-slate-400 mb-4">
                                        Click &quot;Analyze Paper&quot; to {hasErrors ? "retry" : "start"} the multi-agent pipeline
                                    </p>
                                    <button
                                        id="analyze-btn-inline"
                                        className="btn-primary"
                                        onClick={startAnalysis}
                                    >
                                        🚀 {hasErrors ? "Retry Analysis" : "Analyze Paper"}
                                    </button>
                                </div>
                            );
                        })()}

                        {analyzing && !analysisComplete && (
                            <div className="glass-card p-12 text-center">
                                <div className="text-4xl mb-4 animate-pulse-slow">⚡</div>
                                <p className="text-lg text-slate-800 mb-2">
                                    Agents are working...
                                </p>
                                <p className="text-sm text-slate-400">
                                    Watch the sidebar for real-time progress
                                </p>
                            </div>
                        )}

                        {activeResult && (
                            <ResultView
                                agentName={activeTab}
                                result={activeResult as Record<string, unknown>}
                            />
                        )}

                        {/* Show per-tab status when no result is available but analysis is done */}
                        {!activeResult && analysisComplete && (() => {
                            const tabAnalysis = paper?.analyses?.[activeTab];
                            if (!tabAnalysis) {
                                return (
                                    <div className="glass-card p-12 text-center">
                                        <p className="text-4xl mb-4">📭</p>
                                        <p className="text-lg text-slate-700 mb-2">No data available</p>
                                        <p className="text-sm text-slate-400">This agent didn&apos;t produce results. Try re-analyzing the paper.</p>
                                    </div>
                                );
                            }
                            if (tabAnalysis.status === "running") {
                                return (
                                    <div className="glass-card p-12 text-center">
                                        <div className="text-4xl mb-4 animate-pulse-slow">⏳</div>
                                        <p className="text-lg text-slate-700 mb-2">Still processing...</p>
                                        <p className="text-sm text-slate-400">This agent is still running. Please wait or try re-analyzing.</p>
                                    </div>
                                );
                            }
                            if (tabAnalysis.status === "error") {
                                return (
                                    <div className="glass-card p-12 text-center">
                                        <p className="text-4xl mb-4">❌</p>
                                        <p className="text-lg text-slate-700 mb-2">Agent Error</p>
                                        {tabAnalysis.error && (
                                            <p className="text-sm text-red-500 mb-3 max-w-lg mx-auto">
                                                {tabAnalysis.error.length > 300 ? tabAnalysis.error.substring(0, 300) + "..." : tabAnalysis.error}
                                            </p>
                                        )}
                                        <p className="text-sm text-slate-400">Try re-analyzing the paper to fix this.</p>
                                    </div>
                                );
                            }
                            return (
                                <div className="glass-card p-12 text-center">
                                    <p className="text-4xl mb-4">📭</p>
                                    <p className="text-lg text-slate-700 mb-2">No results</p>
                                    <p className="text-sm text-slate-400">This agent completed but returned no data.</p>
                                </div>
                            );
                        })()}
                    </div>
                </section>
            </div>
        </main>
    );
}

function ResultView({
    agentName,
    result,
}: {
    agentName: string;
    result: Record<string, unknown>;
}) {
    if (agentName === "structured_extractor") {
        return <ExtractionView data={result} />;
    }
    if (agentName === "simplifier") {
        return <SimplifierView data={result} />;
    }
    if (agentName === "related_research") {
        return <RelatedResearchView data={result} />;
    }
    if (agentName === "gap_detector") {
        return <GapDetectorView data={result} />;
    }
    if (agentName === "implementation_guide") {
        return <ImplementationView data={result} />;
    }
    return <GenericView data={result} />;
}

/* ---- Extraction View ---- */
function ExtractionView({ data }: { data: Record<string, unknown> }) {
    const sections = [
        { key: "problem_statement", label: "Problem Statement", icon: "🎯" },
        { key: "contributions", label: "Contributions", icon: "⭐" },
        { key: "methodology", label: "Methodology", icon: "⚙️" },
        { key: "dataset", label: "Dataset", icon: "📊" },
        { key: "results", label: "Results", icon: "📈" },
        { key: "limitations", label: "Limitations", icon: "⚠️" },
        { key: "future_work", label: "Future Work", icon: "🔮" },
    ];

    return (
        <div className="space-y-4">
            {data.title && (
                <div className="glass-card p-5">
                    <h3 className="text-lg font-bold text-slate-900">{data.title as string}</h3>
                    {Array.isArray(data.authors) && (
                        <p className="text-sm text-slate-500 mt-1">
                            {(data.authors as string[]).join(", ")}
                        </p>
                    )}
                </div>
            )}
            {sections.map(({ key, label, icon }) => {
                const value = data[key];
                if (!value) return null;
                return (
                    <div key={key} className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-indigo-600 mb-3 flex items-center gap-2">
                            <span>{icon}</span> {label}
                        </h3>
                        <RenderValue value={value} />
                    </div>
                );
            })}
        </div>
    );
}

/* ---- Simplifier View ---- */
function SimplifierView({ data }: { data: Record<string, unknown> }) {
    const [level, setLevel] = useState<"beginner" | "intermediate" | "expert">(
        "beginner"
    );
    const levels = ["beginner", "intermediate", "expert"] as const;
    const levelData = data[level] as Record<string, unknown> | undefined;

    return (
        <div className="space-y-4">
            {data.one_liner && (
                <div className="glass-card-accent p-5">
                    <p className="text-teal-700 font-medium italic">
                        &quot;{data.one_liner as string}&quot;
                    </p>
                </div>
            )}

            <div className="flex gap-2">
                {levels.map((l) => (
                    <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${level === l
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : "text-slate-500 hover:text-slate-700 border border-transparent"
                            }`}
                    >
                        {l === "beginner" ? "🌱" : l === "intermediate" ? "📚" : "🎓"}{" "}
                        {l}
                    </button>
                ))}
            </div>

            {levelData && (
                <div className="glass-card p-6 animate-slide-up">
                    <RenderValue value={levelData} />
                </div>
            )}

            {Array.isArray(data.key_takeaways) && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-3">
                        🔑 Key Takeaways
                    </h3>
                    <ul className="space-y-2">
                        {(data.key_takeaways as string[]).map((t, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-slate-600"
                            >
                                <span className="text-indigo-400 mt-0.5">•</span>
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ---- Related Research View ---- */
function RelatedResearchView({ data }: { data: Record<string, unknown> }) {
    const papers = (data.related_papers || []) as Array<Record<string, unknown>>;

    return (
        <div className="space-y-4">
            {data.research_landscape && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-2">
                        🌐 Research Landscape
                    </h3>
                    <p className="text-sm text-slate-600">
                        {data.research_landscape as string}
                    </p>
                </div>
            )}

            {data.comparison_summary && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-2">
                        📊 Comparison
                    </h3>
                    <p className="text-sm text-slate-600">
                        {data.comparison_summary as string}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {papers.slice(0, 10).map((p, i) => (
                    <div key={i} className="glass-card p-5 group">
                        <h4 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2">
                            {p.title as string}
                        </h4>
                        {p.year && (
                            <span className="text-xs text-slate-400">{p.year as number}</span>
                        )}
                        {p.relevance && (
                            <p className="text-xs text-slate-500 mt-2">
                                {p.relevance as string}
                            </p>
                        )}
                        {p.url && (
                            <a
                                href={p.url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-500 hover:underline mt-2 inline-block"
                            >
                                View Paper →
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---- Gap Detector View ---- */
function GapDetectorView({ data }: { data: Record<string, unknown> }) {
    const novelty = data.novelty_assessment as Record<string, unknown> | undefined;
    const gaps = (data.identified_gaps || []) as Array<Record<string, unknown>>;
    const improvements = (data.improvement_suggestions || []) as Array<
        Record<string, unknown>
    >;

    return (
        <div className="space-y-4">
            {/* Novelty Score */}
            {novelty && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-4xl font-bold glow-text">
                                {novelty.score as number}/10
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Novelty Score</p>
                        </div>
                        <div className="flex-1">
                            <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                                <div
                                    className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
                                    style={{
                                        width: `${((novelty.score as number) || 0) * 10}%`,
                                    }}
                                />
                            </div>
                            <p className="text-sm text-slate-600">
                                {novelty.justification as string}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Gaps */}
            {gaps.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-red-600 mb-3">
                        🎯 Identified Gaps
                    </h3>
                    <div className="space-y-3">
                        {gaps.map((g, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${g.severity === "high"
                                            ? "bg-red-50 text-red-600"
                                            : g.severity === "medium"
                                                ? "bg-yellow-50 text-yellow-600"
                                                : "bg-green-50 text-green-600"
                                            }`}
                                    >
                                        {(g.severity as string)?.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-slate-400 capitalize">
                                        {g.category as string}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700">{g.gap as string}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Improvements */}
            {improvements.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-green-600 mb-3">
                        💡 Improvement Suggestions
                    </h3>
                    <div className="space-y-2">
                        {improvements.map((s, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                            >
                                <p className="text-sm text-slate-800 font-medium">
                                    {s.suggestion as string}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {s.expected_impact as string}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.overall_gap_summary && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-2">
                        📝 Summary
                    </h3>
                    <p className="text-sm text-slate-600 whitespace-pre-line">
                        {data.overall_gap_summary as string}
                    </p>
                </div>
            )}
        </div>
    );
}

/* ---- Implementation View ---- */
function ImplementationView({ data }: { data: Record<string, unknown> }) {
    const techStack = data.tech_stack as Record<string, unknown> | undefined;
    const architecture = data.architecture as Record<string, unknown> | undefined;
    const plan = data.prototype_plan as Record<string, unknown> | undefined;

    return (
        <div className="space-y-4">
            {techStack && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-3">
                        🛠️ Recommended Tech Stack
                    </h3>
                    <RenderValue value={techStack} />
                </div>
            )}

            {architecture && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-3">
                        🏗️ Architecture
                    </h3>
                    <RenderValue value={architecture} />
                </div>
            )}

            {plan && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-3">
                        📋 Prototype Plan
                    </h3>
                    {Object.entries(plan).map(([phase, details]) => (
                        <div
                            key={phase}
                            className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100"
                        >
                            <h4 className="text-sm font-semibold text-slate-800 capitalize mb-2">
                                {phase.replace("_", " ")}
                            </h4>
                            <RenderValue value={details as Record<string, unknown>} />
                        </div>
                    ))}
                </div>
            )}

            {data.code_skeleton && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-indigo-600 mb-3">
                        💻 Code Skeleton
                    </h3>
                    <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap border border-slate-100">
                        {data.code_skeleton as string}
                    </pre>
                </div>
            )}

            {Array.isArray(data.key_challenges) && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-amber-600 mb-3">
                        ⚠️ Key Challenges
                    </h3>
                    <ul className="space-y-1">
                        {(data.key_challenges as string[]).map((c, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-amber-500">•</span> {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ---- Generic Renderer ---- */
function RenderValue({ value }: { value: unknown }) {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
        return <p className="text-sm text-slate-600">{value}</p>;
    }

    if (typeof value === "number") {
        return <span className="text-sm text-slate-800 font-mono">{value}</span>;
    }

    if (Array.isArray(value)) {
        return (
            <ul className="space-y-1">
                {value.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                        <span>{typeof item === "object" ? JSON.stringify(item) : String(item)}</span>
                    </li>
                ))}
            </ul>
        );
    }

    if (typeof value === "object") {
        return (
            <div className="space-y-2">
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                    <div key={k}>
                        <span className="text-xs text-slate-400 uppercase tracking-wide">
                            {k.replace(/_/g, " ")}
                        </span>
                        <div className="ml-2 mt-0.5">
                            <RenderValue value={v} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return <span className="text-sm text-slate-600">{String(value)}</span>;
}

function GenericView({ data }: { data: Record<string, unknown> }) {
    return (
        <div className="glass-card p-6">
            <RenderValue value={data} />
        </div>
    );
}
