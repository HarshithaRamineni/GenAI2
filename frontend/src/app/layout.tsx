import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import GlobalBackground from "@/components/GlobalBackground";

export const metadata: Metadata = {
    title: "ResearchPilot – AI Research Intelligence Hub",
    description:
        "Autonomous multi-agent system for analyzing research papers, extracting insights, detecting gaps, and generating implementation guidance.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="antialiased">
                <div className="mesh-bg" />
                <div className="particles-bg" />
                <GlobalBackground />
                <div className="relative" style={{ zIndex: 2 }}>
                    <AuthProvider>{children}</AuthProvider>
                </div>
            </body>
        </html>
    );
}
