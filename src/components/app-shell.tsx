"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-30 -mx-4 mb-8 border-b border-white/10 bg-[#05070f]/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 shadow-lg shadow-violet-900/40 transition group-hover:scale-105">
              <Rocket className="size-5 text-white" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight tracking-tight text-white">
                Apply<span className="gradient-text">Pilot</span>
              </span>
              <span className="block text-[11px] font-medium text-slate-400">
                AI job applications on autopilot
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "focus-ring flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm",
                    active
                      ? "bg-gradient-to-r from-violet-600/90 to-indigo-500/90 text-white shadow-lg shadow-violet-900/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-[11px] text-slate-500">
        <span>ApplyPilot · local-first · no inbox, no reply tracking — just outbound applications.</span>
        <span className="font-mono">Next.js · Prisma · Supabase · OpenRouter · Nodemailer</span>
      </footer>
    </div>
  );
}
