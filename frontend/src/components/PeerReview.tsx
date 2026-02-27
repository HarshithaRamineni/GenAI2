"use client";

/* ---------- Types ---------- */
export interface ReviewerData {
    reviewer_id: string;
    expertise: string;
    confidence: number;
    overall_score: number;
    scores: Record<string, number>;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    questions: string[];
    detailed_comments: string;
    recommendation: string;
}

export interface MetaReviewData {
    decision: string;
    average_score: number;
    consensus_summary: string;
    key_strengths: string[];
    key_concerns: string[];
    recommendation_to_authors: string;
    verdict_reasoning: string;
}

export interface PeerReviewProps {
    conference?: string;
    reviewers: ReviewerData[];
    meta_review: MetaReviewData;
}

/* ---------- Utils ---------- */
const scoreColor = (s: number) => {
    if (s >= 8) return "text-emerald-400";
    if (s >= 6) return "text-sky-400";
    if (s >= 4) return "text-amber-400";
    return "text-red-400";
};

const scoreBg = (s: number) => {
    if (s >= 8) return "bg-emerald-500/15 border-emerald-500/20";
    if (s >= 6) return "bg-sky-500/15 border-sky-500/20";
    if (s >= 4) return "bg-amber-500/15 border-amber-500/20";
    return "bg-red-500/15 border-red-500/20";
};

const decisionStyle: Record<string, { color: string; bg: string; icon: string }> = {
    accept: { color: "text-emerald-400", bg: "bg-emerald-500/15", icon: "✅" },
    "weak accept": { color: "text-sky-400", bg: "bg-sky-500/15", icon: "👍" },
    borderline: { color: "text-amber-400", bg: "bg-amber-500/15", icon: "⚖️" },
    "weak reject": { color: "text-orange-400", bg: "bg-orange-500/15", icon: "⚠️" },
    reject: { color: "text-red-400", bg: "bg-red-500/15", icon: "❌" },
};

const recLabel: Record<string, string> = {
    accept: "Accept",
    weak_accept: "Weak Accept",
    borderline: "Borderline",
    weak_reject: "Weak Reject",
    reject: "Reject",
};

const SCORE_LABELS: Record<string, string> = {
    novelty: "Novelty",
    technical_quality: "Technical Quality",
    clarity: "Clarity",
    significance: "Significance",
    reproducibility: "Reproducibility",
    experimental_design: "Experimental Design",
};

/* ---------- Component ---------- */
export default function PeerReview({ conference, reviewers, meta_review }: PeerReviewProps) {
    const decision = (meta_review.decision || "borderline").toLowerCase();
    const ds = decisionStyle[decision] || decisionStyle.borderline;

    return (
        <div className="space-y-4">
            {/* Meta Review / Decision Banner */}
            <div className="glass-card-static p-6 relative overflow-hidden">
                {/* Glow accent */}
                <div className={`absolute top-0 left-0 w-full h-1 ${ds.bg}`} />

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{ds.icon}</span>
                            <span className={`text-xl font-black ${ds.color}`}>
                                {meta_review.decision}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">
                            {conference || "AI/ML Conference 2026 (Simulated)"}
                        </p>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-black ${scoreColor(meta_review.average_score)}`}>
                            {meta_review.average_score.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Avg Score</div>
                    </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    {meta_review.consensus_summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <h4 className="text-[10px] text-emerald-400 font-semibold uppercase mb-1.5">Key Strengths</h4>
                        <ul className="space-y-1">
                            {meta_review.key_strengths?.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <h4 className="text-[10px] text-red-400 font-semibold uppercase mb-1.5">Key Concerns</h4>
                        <ul className="space-y-1">
                            {meta_review.key_concerns?.map((c, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                                    <span className="text-red-500 mt-0.5 shrink-0">✕</span>{c}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <h4 className="text-[10px] text-indigo-400 font-semibold uppercase mb-1.5">Recommendation to Authors</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{meta_review.recommendation_to_authors}</p>
                </div>
            </div>

            {/* Individual Reviewers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {reviewers.map((r, idx) => {
                    const rec = recLabel[r.recommendation] || r.recommendation || "N/A";
                    return (
                        <div key={idx} className="glass-card-static p-5 flex flex-col">
                            {/* Reviewer Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${scoreBg(r.overall_score)} ${scoreColor(r.overall_score)}`}>
                                        {r.reviewer_id}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-white">Reviewer {r.reviewer_id}</p>
                                        <p className="text-[10px] text-slate-500">{r.expertise}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-black ${scoreColor(r.overall_score)}`}>
                                        {r.overall_score}/10
                                    </div>
                                    <p className={`text-[10px] ${scoreColor(r.overall_score)}`}>{rec}</p>
                                </div>
                            </div>

                            {/* Score Bars */}
                            <div className="space-y-1.5 mb-3 p-2.5 rounded-lg bg-white/[0.02]">
                                {Object.entries(r.scores || {}).map(([key, val]) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 w-24 shrink-0 truncate">
                                            {SCORE_LABELS[key] || key}
                                        </span>
                                        <div className="flex-1 h-1.5 rounded-full bg-white/5">
                                            <div
                                                className={`h-full rounded-full transition-all ${val >= 8 ? "bg-emerald-400" : val >= 6 ? "bg-sky-400" : val >= 4 ? "bg-amber-400" : "bg-red-400"
                                                    }`}
                                                style={{ width: `${(val / 10) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-mono ${scoreColor(val)}`}>{val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Summary */}
                            <p className="text-xs text-slate-400 leading-relaxed mb-3 italic">
                                &quot;{r.summary}&quot;
                            </p>

                            {/* Strengths / Weaknesses */}
                            <div className="space-y-2 mb-3 flex-1">
                                <div>
                                    <h5 className="text-[10px] text-emerald-400 font-semibold uppercase mb-1">Strengths</h5>
                                    {r.strengths?.map((s, i) => (
                                        <p key={i} className="text-xs text-slate-400 flex items-start gap-1.5 mb-0.5">
                                            <span className="text-emerald-500 mt-0.5 shrink-0">+</span>{s}
                                        </p>
                                    ))}
                                </div>
                                <div>
                                    <h5 className="text-[10px] text-red-400 font-semibold uppercase mb-1">Weaknesses</h5>
                                    {r.weaknesses?.map((w, i) => (
                                        <p key={i} className="text-xs text-slate-400 flex items-start gap-1.5 mb-0.5">
                                            <span className="text-red-500 mt-0.5 shrink-0">−</span>{w}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Questions */}
                            {r.questions && r.questions.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                    <h5 className="text-[10px] text-indigo-400 font-semibold uppercase mb-1">Questions for Authors</h5>
                                    {r.questions.map((q, i) => (
                                        <p key={i} className="text-xs text-slate-400 mb-0.5">
                                            {i + 1}. {q}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
