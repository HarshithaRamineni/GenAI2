"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { sendChat, getChatHistory, ChatMessage } from "@/lib/api";

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const paperId = params.id as string;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

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

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const question = input.trim();
        setInput("");

        // Optimistic user message
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: question,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const { answer } = await sendChat(paperId, question);
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
        }
    };

    return (
        <main className="min-h-screen flex flex-col">
            {/* Header */}
            <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/paper/${paperId}`)}
                        className="text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <span className="text-lg font-bold text-slate-800">
                            Ask About This Paper
                        </span>
                    </div>
                </div>
                <span className="text-xs text-slate-400">
                    Powered by RAG + Gemini AI
                </span>
            </nav>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
                {messages.length === 0 && !loading && (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">🧠</div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            Research Q&A Assistant
                        </h2>
                        <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                            Ask any question about the paper. I&apos;ll use RAG to find the most
                            relevant sections and provide accurate answers.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                            {[
                                "What is the main contribution?",
                                "Explain the methodology",
                                "What datasets were used?",
                                "What are the limitations?",
                            ].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => {
                                        setInput(q);
                                    }}
                                    className="glass-card p-3 text-sm text-slate-600 text-left hover:text-slate-800 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                            } animate-slide-up`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === "user"
                                    ? "bg-indigo-500 text-white"
                                    : "glass-card text-slate-700"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </p>
                            <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                                {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-slide-up">
                        <div className="glass-card px-5 py-3 rounded-2xl">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="animate-pulse-slow">●</span>
                                <span className="animate-pulse-slow" style={{ animationDelay: "200ms" }}>●</span>
                                <span className="animate-pulse-slow" style={{ animationDelay: "400ms" }}>●</span>
                                <span className="ml-2">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-4">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        id="chat-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask a question about the paper..."
                        className="flex-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                        disabled={loading}
                    />
                    <button
                        id="chat-send-btn"
                        className="btn-primary px-6"
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                    >
                        Send
                    </button>
                </div>
            </div>
        </main>
    );
}
