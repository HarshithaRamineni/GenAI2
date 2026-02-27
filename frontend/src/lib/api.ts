const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ---------- Types ---------- */
export interface Paper {
    id: string;
    title: string;
    source_type: string;
    source_url?: string;
    status: string;
    upload_date: string;
    text_length?: number;
    analyses?: Record<string, AgentResult>;
}

export interface AgentResult {
    status: string;
    result: Record<string, unknown>;
    error?: string;
    started_at?: string;
    finished_at?: string;
}

export interface AgentProgress {
    agent: string;
    status: string;
    detail: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export interface Workspace {
    id: string;
    name: string;
    paper_ids: string[];
    created_at: string;
}

export interface ConversationSummary {
    paper_id: string;
    paper_title: string;
    message_count: number;
    last_message: string;
    last_activity: string;
}

export interface KnowledgeGraphData {
    nodes: Array<{
        id: string;
        label: string;
        type: string;
        importance: number;
        description?: string;
    }>;
    edges: Array<{
        source: string;
        target: string;
        label: string;
        strength: number;
    }>;
    clusters?: Array<{ name: string; node_ids: string[] }>;
    summary?: string;
}

/* ---------- Papers ---------- */
export async function uploadPaper(file?: File, url?: string): Promise<Paper> {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (url) formData.append("url", url);

    const res = await fetch(`${API_BASE}/api/papers/upload`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function listPapers(): Promise<Paper[]> {
    const res = await fetch(`${API_BASE}/api/papers`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch papers");
    return res.json();
}

export async function getPaper(id: string): Promise<Paper> {
    const res = await fetch(`${API_BASE}/api/papers/${id}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch paper");
    return res.json();
}

export async function searchPapers(query: string): Promise<Paper[]> {
    const res = await fetch(
        `${API_BASE}/api/papers/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Search failed");
    return res.json();
}

export function analyzeSSE(
    paperId: string,
    onEvent: (event: AgentProgress) => void,
    onDone: () => void,
    onError: (err: string) => void
) {
    const eventSource = new EventSource(
        `${API_BASE}/api/papers/${paperId}/analyze`
    );

    eventSource.onmessage = (e) => {
        try {
            const data: AgentProgress = JSON.parse(e.data);
            onEvent(data);
            if (
                data.agent === "pipeline" &&
                (data.status === "completed" || data.status === "error")
            ) {
                eventSource.close();
                onDone();
            }
        } catch {
            // skip malformed events
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
        onError("Connection to analysis stream lost");
    };

    return () => eventSource.close();
}

/* ---------- Chat ---------- */
export async function sendChat(
    paperId: string,
    question: string
): Promise<{ answer: string }> {
    const res = await fetch(`${API_BASE}/api/papers/${paperId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
}

export async function getChatHistory(
    paperId: string
): Promise<{ messages: ChatMessage[] }> {
    const res = await fetch(`${API_BASE}/api/papers/${paperId}/chat/history`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch chat history");
    return res.json();
}

/* ---------- Conversation History ---------- */
export async function getConversationHistory(): Promise<ConversationSummary[]> {
    const res = await fetch(`${API_BASE}/api/conversations`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch conversation history");
    return res.json();
}

/* ---------- Workspaces ---------- */
export async function listWorkspaces(): Promise<Workspace[]> {
    const res = await fetch(`${API_BASE}/api/workspaces`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch workspaces");
    return res.json();
}

export async function createWorkspace(name: string): Promise<Workspace> {
    const res = await fetch(`${API_BASE}/api/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create workspace");
    return res.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete workspace");
}

export async function addPaperToWorkspace(
    workspaceId: string,
    paperId: string
): Promise<void> {
    const res = await fetch(
        `${API_BASE}/api/workspaces/${workspaceId}/papers`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paper_id: paperId }),
        }
    );
    if (!res.ok) throw new Error("Failed to add paper");
}

export async function removePaperFromWorkspace(
    workspaceId: string,
    paperId: string
): Promise<void> {
    const res = await fetch(
        `${API_BASE}/api/workspaces/${workspaceId}/papers/${paperId}`,
        { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to remove paper");
}

/* ---------- Knowledge Graph ---------- */
export async function getKnowledgeGraph(
    paperId: string
): Promise<KnowledgeGraphData> {
    const res = await fetch(
        `${API_BASE}/api/papers/${paperId}/knowledge-graph`,
        { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Knowledge graph not available");
    return res.json();
}

export interface RecentGraph {
    paper_id: string;
    paper_title: string;
    nodes: Array<{ id: string; label: string; type: string; importance: number }>;
    edges: Array<{ source: string; target: string; label: string; strength: number }>;
    summary: string;
    finished_at: string | null;
}

export async function getRecentGraphs(): Promise<RecentGraph[]> {
    const res = await fetch(`${API_BASE}/api/papers/recent-graphs`, {
        cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
}

export interface PlagiarismReportData {
    overall_originality_score: number;
    verdict: string;
    verdict_label: string;
    flagged_sections: Array<{
        claim_id: string;
        claim_text: string;
        severity: string;
        overlap_percentage: number;
        explanation: string;
        similar_source_title?: string;
        similar_source_url?: string;
    }>;
    matched_sources: Array<{
        title: string;
        authors?: string;
        year?: number;
        url?: string;
        similarity_score: number;
        overlap_description: string;
    }>;
    original_contributions?: string[];
    summary: string;
}

export async function getPlagiarismReport(
    paperId: string
): Promise<PlagiarismReportData> {
    const res = await fetch(
        `${API_BASE}/api/papers/${paperId}/plagiarism-report`,
        { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Plagiarism report not available");
    return res.json();
}
