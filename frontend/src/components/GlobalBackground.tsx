"use client";
import dynamic from "next/dynamic";

const ParticleSphere = dynamic(
    () => import("@/components/ParticleSphere"),
    { ssr: false }
);

export default function GlobalBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            <ParticleSphere className="w-full h-full" count={8000} radius={3.2} color="#a5b4fc" />
        </div>
    );
}
