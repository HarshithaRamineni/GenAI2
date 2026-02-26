import type { Metadata } from "next";
import "./globals.css";

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
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="antialiased">
                <div className="particles-bg" />
                <div className="relative z-10">{children}</div>
            </body>
        </html>
    );
}
