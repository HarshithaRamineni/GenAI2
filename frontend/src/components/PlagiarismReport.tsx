"use client";

/* ---------- Types ---------- */
export interface FlaggedSection {
    claim_id: string;
    claim_text: string;
    severity: "low" | "medium" | "high";
    overlap_percentage: number;
    explanation: string;
    similar_source_title?: string;
    similar_source_url?: string;
}

export interface MatchedSource {
    title: string;
    authors?: string;
    year?: number;
    url?: string;
    similarity_score: number;
    overlap_description: string;
}

export interface PlagiarismData {
    overall_originality_score: number;
    verdict: string;
    verdict_label: string;
    flagged_sections: FlaggedSection[];
    matched_sources: MatchedSource[];
    original_contributions?: string[];
    summary: string;
    claims_analyzed?: number;
    raw_search_results?: number;
}

/* ---------- Colors / Utils ---------- */
const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: "#34d399", bg: "rgba(52,211,153,0.1)", label: "text-emerald-400" };
    if (score >= 50) return { ring: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "text-amber-400" };
    return { ring: "#f87171", bg: "rgba(248,113,113,0.1)", label: "text-red-400" };
};

const severityConfig = {
    low: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "✓" },
    medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "⚠" },
    high: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: "✕" },
};

/* ---------- Component ---------- */
export default function PlagiarismReport({ data }: { data: PlagiarismData }) {
    const score = Math.max(0, Math.min(100, data.overall_originality_score || 0));
    const colors = getScoreColor(score);

    // SVG ring parameters
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="space-y-4">
            {/* Score + Verdict Header */}
            <div className="glass-card-static p-6">
                <div className="flex items-center gap-8">
                    {/* Circular Score Gauge */}
                    <div className="relative shrink-0">
                        <svg width="140" height="140" viewBox="0 0 140 140">
                            {/* Background ring */}
                            <circle
                                cx="70" cy="70" r={radius}
                                fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
                            />
                            {/* Score ring */}
                            <circle
                                cx="70" cy="70" r={radius}
                                fill="none" stroke={colors.ring} strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                transform="rotate(-90 70 70)"
                                style={{ transition: "stroke-dashoffset 1s ease-out" }}
                            />
                            {/* Glow */}
                            <circle
                                cx="70" cy="70" r={radius}
                                fill="none" stroke={colors.ring} strokeWidth="2" opacity="0.3"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                transform="rotate(-90 70 70)"
                                filter="blur(4px)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-black ${colors.label}`}>{score}%</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Original</span>
                        </div>
                    </div>

                    {/* Verdict Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-lg font-bold ${colors.label}`}>
                                {data.verdict_label || "Analysis Complete"}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-3">{data.summary}</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-500">
                            {data.claims_analyzed && (
                                <span>{data.claims_analyzed} claims analyzed</span>
                            )}
                            {data.raw_search_results && (
                                <span>{data.raw_search_results} sources searched</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Original Contributions */}
            {data.original_contributions && data.original_contributions.length > 0 && (
                <div className="glass-card-static p-5">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <span>✨</span> Original Contributions
                    </h3>
                    <ul className="space-y-1.5">
                        {data.original_contributions.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Flagged Sections */}
            {data.flagged_sections && data.flagged_sections.length > 0 && (
                <div className="glass-card-static p-5">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        <span>🔍</span> Flagged Sections
                        <span className="text-[10px] text-slate-500 font-normal ml-auto">
                            {data.flagged_sections.length} section(s)
                        </span>
                    </h3>
                    <div className="space-y-2.5">
                        {data.flagged_sections.map((section, i) => {
                            const sev = severityConfig[section.severity] || severityConfig.low;
                            return (
                                <div
                                    key={i}
                                    className={`p-3 rounded-lg bg-white/[0.02] border ${sev.border}`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`text-xs ${sev.color}`}>{sev.icon}</span>
                                        <span className={`text-[10px] font-medium ${sev.color} ${sev.bg} px-2 py-0.5 rounded uppercase`}>
                                            {section.severity}
                                        </span>
                                        <span className="text-[10px] text-slate-500 ml-auto">
                                            {section.overlap_percentage}% overlap
                                        </span>
                                    </div>
                                    <p className="text-sm text-white mb-1">
                                        &quot;{section.claim_text}&quot;
                                    </p>
                                    <p className="text-xs text-slate-400">{section.explanation}</p>
                                    {section.similar_source_title && (
                                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-400">
                                            <span>📄</span>
                                            {section.similar_source_url ? (
                                                <a href={section.similar_source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    {section.similar_source_title}
                                                </a>
                                            ) : (
                                                <span>{section.similar_source_title}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Matched Sources */}
            {data.matched_sources && data.matched_sources.length > 0 && (
                <div className="glass-card-static p-5">
                    <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                        <span>📚</span> Similar Published Work
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {data.matched_sources.map((source, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-lg bg-white/[0.03] border border-white/5"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-medium text-white line-clamp-2 flex-1">
                                        {source.title}
                                    </h4>
                                    <span
                                        className={`text-[10px] font-bold shrink-0 px-2 py-0.5 rounded ${source.similarity_score > 60
                                                ? "bg-red-500/15 text-red-400"
                                                : source.similarity_score > 30
                                                    ? "bg-amber-500/15 text-amber-400"
                                                    : "bg-emerald-500/15 text-emerald-400"
                                            }`}
                                    >
                                        {source.similarity_score}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                                    {source.authors && <span>{source.authors}</span>}
                                    {source.year && <span>• {source.year}</span>}
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2">
                                    {source.overlap_description}
                                </p>
                                {typeof source.url === "string" && (
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-400 hover:underline mt-1.5 inline-block"
                                    >
                                        View Paper →
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
