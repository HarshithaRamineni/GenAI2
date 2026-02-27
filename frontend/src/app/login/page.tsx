"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
    const router = useRouter();
    const { login, register, loginWithGoogle, user, loading } = useAuth();

    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!loading && user) { router.replace("/"); return null; }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSubmitting(true);
        try {
            if (isRegister) await register(email, password, displayName || undefined);
            else await login(email, password);
            router.replace("/");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Authentication failed";
            setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
        } finally { setSubmitting(false); }
    };

    const handleGoogle = async () => {
        setError("");
        try { await loginWithGoogle(); router.replace("/"); }
        catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Google sign-in failed";
            setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-2xl animate-pulse-slow glow-text font-bold">Loading...</div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-indigo-500/25">
                            R
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white">
                        Research<span className="glow-text">Pilot</span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">AI-Powered Research Intelligence Hub</p>
                </div>

                {/* Auth Card */}
                <div className="glass-card-static p-8">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">
                        {isRegister ? "Create Account" : "Welcome Back"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Name</label>
                                <input
                                    id="display-name-input"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input
                                id="email-input"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <input
                                id="password-input"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>
                        )}

                        <button
                            id="auth-submit-btn"
                            type="submit"
                            disabled={submitting}
                            className="btn-primary w-full text-center py-3.5"
                        >
                            <span>{submitting ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}</span>
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-slate-500">OR</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Google Sign-in */}
                    <button
                        id="google-signin-btn"
                        onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-200 font-medium hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Toggle */}
                    <p className="text-center text-sm text-slate-500 mt-6">
                        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                            id="toggle-auth-mode"
                            onClick={() => { setIsRegister(!isRegister); setError(""); }}
                            className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
                        >
                            {isRegister ? "Sign In" : "Sign Up"}
                        </button>
                    </p>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">
                    ResearchPilot by StarForged • Powered by Gemini AI
                </p>
            </div>
        </main>
    );
}
