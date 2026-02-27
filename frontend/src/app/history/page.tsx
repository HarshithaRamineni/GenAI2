"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getConversationHistory, ConversationSummary } from "@/lib/api";

export default function HistoryPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try { setConversations(await getConversationHistory()); }
        catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (user) fetchHistory(); }, [user, fetchHistory]);

    if (authLoading || !user) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-2xl animate-pulse-slow glow-text font-bold">Loading...</div>
            </main>
        );
    }

    return (
        <main className="min-h-screen">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
                    <button onClick={() => router.push("/")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <span>←</span>
                        <span className="text-lg font-bold text-white">Research<span className="glow-text">Pilot</span></span>
                    </button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-extrabold text-white mb-8">
                    💬 <span className="glow-text">Conversation History</span>
                </h1>

                {loading ? (
                    <div className="glass-card-static p-12 text-center">
                        <div className="text-4xl mb-4 animate-pulse-slow">💬</div>
                        <p className="text-slate-400">Loading conversations...</p>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="glass-card-static p-12 text-center">
                        <p className="text-4xl mb-4">📭</p>
                        <p className="text-lg text-white mb-2">No conversations yet</p>
                        <p className="text-sm text-slate-500 mb-4">Start chatting with your research papers to see conversation history here.</p>
                        <button onClick={() => router.push("/")} className="btn-primary"><span>Upload a Paper</span></button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {conversations.map((conv) => (
                            <button key={conv.paper_id} onClick={() => router.push(`/paper/${conv.paper_id}/chat`)} className="glass-card w-full p-5 flex items-center justify-between text-left">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{conv.paper_title}</h3>
                                    <p className="text-sm text-slate-400 mt-1 truncate">{conv.last_message}</p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        {conv.message_count} message(s) • {new Date(conv.last_activity).toLocaleDateString()}{" "}
                                        {new Date(conv.last_activity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                <div className="ml-4 text-slate-600 text-lg">→</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
