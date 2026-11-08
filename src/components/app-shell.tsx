"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings2, SquareTerminal } from "lucide-react";
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
      <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-[#2a2a30] bg-[#0d0d0f]/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[4px] border border-[#3b3263] bg-[#241f3d]">
              <SquareTerminal className="size-4 text-[#b9aaff]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-white">
                ApplyPilot
              </span>
              <span className="block text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#77777f]">
                job application autopilot
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-[4px] border border-[#2a2a30] bg-[#131316] p-1">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "focus-ring flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[12px] font-semibold transition",
                    active
                      ? "bg-[#7c6cf5] text-white"
                      : "text-[#a8a8b3] hover:bg-[#23232a] hover:text-white"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2a30] pt-4 text-[11px] text-[#6b6b76]">
        <span>ApplyPilot · local-first · no inbox, no reply tracking — outbound applications only.</span>
        <span className="font-mono">Next.js · Prisma · Supabase · OpenRouter · Nodemailer · TipTap</span>
      </footer>
    </div>
  );
}
