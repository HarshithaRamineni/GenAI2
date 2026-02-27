"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { sendChat, getChatHistory, ChatMessage } from "@/lib/api";

/* ---- Minimal markdown → HTML renderer ---- */
function renderMarkdown(text: string): string {
    let html = text
        // code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="md-code-block"><code>$2</code></pre>')
        // inline code
        .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
        // bold
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        // italic
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        // headers
        .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
        // horizontal rule
        .replace(/^[-–—]{3,}$/gm, '<hr class="md-hr"/>')
        // unordered list items
        .replace(/^[•\-\*] (.+)$/gm, '<li class="md-li">$1</li>')
        // numbered list items
        .replace(/^\d+\.\s+(.+)$/gm, '<li class="md-li-num">$1</li>')
        // line breaks
        .replace(/<br\s*\/?>/gi, "<br/>")
        // paragraphs (double newline)
        .replace(/\n\n/g, '</p><p class="md-p">')
        // single newlines
        .replace(/\n/g, "<br/>");

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li class="md-li">.*?<\/li>\s*)+)/g, '<ul class="md-ul">$1</ul>');
    html = html.replace(/((?:<li class="md-li-num">.*?<\/li>\s*)+)/g, '<ol class="md-ol">$1</ol>');

    // Simple table detection: lines with |
    html = html.replace(
        /(?:<br\/>)?\|(.+)\|(?:<br\/>)\|[-\s|:]+\|((?:<br\/>\|.+\|)+)/g,
        (_, header, body) => {
            const headers = header.split("|").map((h: string) => h.trim()).filter(Boolean);
            const rows = body.split("<br/>").filter((r: string) => r.includes("|"));
            let table = '<table class="md-table"><thead><tr>';
            headers.forEach((h: string) => { table += `<th>${h}</th>`; });
            table += "</tr></thead><tbody>";
            rows.forEach((row: string) => {
                const cells = row.split("|").map((c: string) => c.trim()).filter(Boolean);
                table += "<tr>";
                cells.forEach((c: string) => { table += `<td>${c}</td>`; });
                table += "</tr>";
            });
            table += "</tbody></table>";
            return table;
        }
    );

    return `<p class="md-p">${html}</p>`;
}

const SUGGESTIONS = [
    { icon: "🎯", text: "What is the main contribution?" },
    { icon: "🔬", text: "Explain the methodology" },
    { icon: "📊", text: "What datasets were used?" },
    { icon: "⚠️", text: "What are the limitations?" },
    { icon: "💡", text: "Summarize in simple terms" },
    { icon: "🔗", text: "How does this compare to prior work?" },
];

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const paperId = params.id as string;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchHistory = useCallback(async () => {
        try {
            const { messages: history } = await getChatHistory(paperId);
            setMessages(history);
        } catch {
            /* ignore */
        }
    }, [paperId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (question?: string) => {
        const q = (question || input).trim();
        if (!q || loading) return;
        setInput("");

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: q,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const { answer } = await sendChat(paperId, q);
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: answer,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error processing your question. Please try again.",
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-[#0a0f1e]">
            {/* ====== Header ====== */}
            <nav className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0f1e]/80 border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/paper/${paperId}`)}
                            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Back
                        </button>
                        <div className="h-5 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs">
                                💬
                            </div>
                            <span className="text-sm font-semibold text-white">
                                Research Q&A
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            RAG + Cerebras AI
                        </span>
                    </div>
                </div>
            </nav>

            {/* ====== Messages Area ====== */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

                    {/* Empty State */}
                    {messages.length === 0 && !loading && (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/5 flex items-center justify-center text-4xl">
                                🧠
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Ask About This Paper
                            </h2>
                            <p className="text-slate-500 text-sm max-w-md mx-auto mb-10">
                                Powered by RAG — I search the paper&apos;s content to give you accurate, context-aware answers.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-2xl mx-auto">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s.text}
                                        onClick={() => handleSend(s.text)}
                                        className="glass-card p-3.5 text-left group hover:border-indigo-500/30 transition-all"
                                    >
                                        <span className="text-base mb-1.5 block">{s.icon}</span>
                                        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                                            {s.text}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message Bubbles */}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
                        >
                            {msg.role === "assistant" && (
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-[11px] mr-2.5 mt-1 shrink-0 shadow-lg shadow-indigo-500/20">
                                    AI
                                </div>
                            )}
                            <div
                                className={`max-w-[75%] rounded-2xl px-5 py-3.5 ${msg.role === "user"
                                        ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                        : "bg-white/[0.04] border border-white/[0.06] text-slate-200"
                                    }`}
                            >
                                {msg.role === "assistant" ? (
                                    <div
                                        className="chat-markdown text-sm leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                    />
                                ) : (
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                )}
                                <p className={`text-[10px] mt-2.5 ${msg.role === "user" ? "text-indigo-200/60" : "text-slate-600"
                                    }`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                            {msg.role === "user" && (
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white text-[11px] font-bold ml-2.5 mt-1 shrink-0">
                                    U
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {loading && (
                        <div className="flex justify-start animate-slide-up">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-[11px] mr-2.5 mt-1 shrink-0">
                                AI
                            </div>
                            <div className="bg-white/[0.04] border border-white/[0.06] px-5 py-4 rounded-2xl">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    <span className="text-xs text-slate-500 ml-2">Searching paper & generating answer...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>

            {/* ====== Input Bar ====== */}
            <div className="sticky bottom-0 backdrop-blur-xl bg-[#0a0f1e]/80 border-t border-white/5 p-4">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        ref={inputRef}
                        id="chat-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask a question about the paper..."
                        className="flex-1 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                        disabled={loading}
                    />
                    <button
                        id="chat-send-btn"
                        className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || loading}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Send
                    </button>
                </div>
            </div>

            {/* ====== Markdown Styles ====== */}
            <style jsx global>{`
                .chat-markdown .md-p { margin-bottom: 0.5em; }
                .chat-markdown .md-p:last-child { margin-bottom: 0; }
                .chat-markdown .md-h2 { font-size: 1.1em; font-weight: 700; color: #e2e8f0; margin: 0.8em 0 0.3em; }
                .chat-markdown .md-h3 { font-size: 1em; font-weight: 700; color: #e2e8f0; margin: 0.7em 0 0.3em; }
                .chat-markdown .md-h4 { font-size: 0.95em; font-weight: 600; color: #cbd5e1; margin: 0.5em 0 0.2em; }
                .chat-markdown strong { color: #e2e8f0; font-weight: 600; }
                .chat-markdown em { color: #94a3b8; font-style: italic; }
                .chat-markdown .md-inline-code {
                    background: rgba(129,140,248,0.12);
                    color: #a5b4fc;
                    padding: 0.15em 0.4em;
                    border-radius: 4px;
                    font-size: 0.88em;
                    font-family: 'Fira Code', monospace;
                }
                .chat-markdown .md-code-block {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 0.8em 1em;
                    margin: 0.5em 0;
                    overflow-x: auto;
                    font-size: 0.82em;
                    line-height: 1.5;
                    color: #94a3b8;
                    font-family: 'Fira Code', monospace;
                }
                .chat-markdown .md-ul, .chat-markdown .md-ol {
                    padding-left: 1.2em;
                    margin: 0.4em 0;
                }
                .chat-markdown .md-li, .chat-markdown .md-li-num {
                    margin-bottom: 0.25em;
                    line-height: 1.5;
                }
                .chat-markdown .md-li::marker { color: #818cf8; }
                .chat-markdown .md-li-num::marker { color: #818cf8; }
                .chat-markdown .md-hr {
                    border: none;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    margin: 0.8em 0;
                }
                .chat-markdown .md-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0.5em 0;
                    font-size: 0.85em;
                }
                .chat-markdown .md-table th {
                    background: rgba(255,255,255,0.04);
                    padding: 0.4em 0.6em;
                    text-align: left;
                    font-weight: 600;
                    color: #e2e8f0;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .chat-markdown .md-table td {
                    padding: 0.35em 0.6em;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    color: #94a3b8;
                }
                .chat-markdown .md-table tr:hover td {
                    background: rgba(255,255,255,0.02);
                }
            `}</style>
        </main>
    );
}
