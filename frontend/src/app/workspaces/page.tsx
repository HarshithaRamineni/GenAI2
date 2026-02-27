"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
    listWorkspaces, createWorkspace, deleteWorkspace,
    listPapers, addPaperToWorkspace, removePaperFromWorkspace,
    Workspace, Paper,
} from "@/lib/api";

export default function WorkspacesPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [papers, setPapers] = useState<Paper[]>([]);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showAssign, setShowAssign] = useState<string | null>(null);

    useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

    const fetchAll = useCallback(async () => {
        try {
            const [ws, ps] = await Promise.all([listWorkspaces(), listPapers()]);
            setWorkspaces(ws); setPapers(ps);
        } catch { /* */ }
    }, []);

    useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try { await createWorkspace(newName.trim()); setNewName(""); await fetchAll(); }
        catch { /* */ } finally { setCreating(false); }
    };

    const handleDelete = async (id: string) => {
        try { await deleteWorkspace(id); await fetchAll(); } catch { /* */ }
    };

    const handleAssign = async (workspaceId: string, paperId: string) => {
        try { await addPaperToWorkspace(workspaceId, paperId); await fetchAll(); } catch { /* */ }
    };

    const handleRemovePaper = async (workspaceId: string, paperId: string) => {
        try { await removePaperFromWorkspace(workspaceId, paperId); await fetchAll(); } catch { /* */ }
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
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-extrabold text-white">
                        📁 <span className="glow-text">Workspaces</span>
                    </h1>
                    <span className="text-xs text-slate-500">{workspaces.length} workspace(s)</span>
                </div>

                {/* Create */}
                <div className="glass-card-static p-5 mb-8 flex gap-3">
                    <input
                        id="workspace-name-input"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        placeholder="New workspace name..."
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                    <button id="create-workspace-btn" className="btn-primary px-6" onClick={handleCreate} disabled={creating || !newName.trim()}>
                        <span>{creating ? "Creating..." : "+ Create"}</span>
                    </button>
                </div>

                {workspaces.length === 0 ? (
                    <div className="glass-card-static p-12 text-center">
                        <p className="text-4xl mb-4">📂</p>
                        <p className="text-lg text-white mb-2">No workspaces yet</p>
                        <p className="text-sm text-slate-500">Create a workspace to organize your research papers.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {workspaces.map((ws) => (
                            <div key={ws.id} className="glass-card-static overflow-hidden">
                                <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpanded(expanded === ws.id ? null : ws.id)}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📁</span>
                                        <div>
                                            <h3 className="font-semibold text-white">{ws.name}</h3>
                                            <p className="text-xs text-slate-500">{ws.paper_ids.length} paper(s) • {new Date(ws.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setShowAssign(showAssign === ws.id ? null : ws.id); }} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors font-medium">+ Add Paper</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium">Delete</button>
                                        <span className="text-slate-600 text-sm ml-2">{expanded === ws.id ? "▲" : "▼"}</span>
                                    </div>
                                </div>

                                {showAssign === ws.id && (
                                    <div className="px-5 pb-4 border-t border-white/5">
                                        <p className="text-xs text-slate-500 pt-3 pb-2">Select a paper to add:</p>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {papers.filter((p) => !ws.paper_ids.includes(p.id)).map((p) => (
                                                <button key={p.id} onClick={() => { handleAssign(ws.id, p.id); setShowAssign(null); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-indigo-500/10 transition-colors truncate">
                                                    {p.title}
                                                </button>
                                            ))}
                                            {papers.filter((p) => !ws.paper_ids.includes(p.id)).length === 0 && (
                                                <p className="text-xs text-slate-600 py-2">All papers are already in this workspace.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {expanded === ws.id && (
                                    <div className="px-5 pb-5 border-t border-white/5">
                                        {ws.paper_ids.length === 0 ? (
                                            <p className="text-sm text-slate-500 py-4 text-center">No papers in this workspace yet.</p>
                                        ) : (
                                            <div className="space-y-2 pt-3">
                                                {ws.paper_ids.map((pid) => {
                                                    const paper = papers.find((p) => p.id === pid);
                                                    return (
                                                        <div key={pid} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                                            <button onClick={() => router.push(`/paper/${pid}`)} className="flex-1 text-left text-sm text-slate-300 hover:text-indigo-300 truncate font-medium transition-colors">
                                                                {paper?.title || pid}
                                                            </button>
                                                            <button onClick={() => handleRemovePaper(ws.id, pid)} className="text-xs text-slate-600 hover:text-red-400 ml-2 transition-colors">✕</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
