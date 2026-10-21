import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { NavRail } from "@/components/shell/nav-rail";
import { TopBarBoundary } from "@/components/shell/top-bar";
import { ToastHost } from "@/components/toast-host";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COMC — Critical Minerals Operations Center",
  description:
    "Local operations dashboard for critical-minerals mining: production, fleet, safety, environment, inventory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink lg:flex-row">
        {/* usePathname suspends while prerendering routes with dynamic params */}
        <Suspense
          fallback={
            <nav className="hidden w-52 shrink-0 border-r border-line bg-panel-2 lg:block" />
          }
        >
          <NavRail />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBarBoundary />
          <main className="scroll-slim flex-1 overflow-y-auto p-3 lg:p-5">
            {children}
          </main>
        </div>
        <ToastHost />
      </body>
    </html>
  );
}
