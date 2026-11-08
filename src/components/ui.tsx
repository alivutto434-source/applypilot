"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  icon,
  title,
  hint,
  accent = "violet",
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  accent?: "violet" | "sky" | "emerald" | "amber" | "rose";
  action?: React.ReactNode;
}) {
  const accents: Record<string, string> = {
    violet: "from-violet-500/25 to-fuchsia-500/10 text-violet-200 ring-violet-400/40",
    sky: "from-sky-500/25 to-cyan-500/10 text-sky-200 ring-sky-400/40",
    emerald: "from-emerald-500/25 to-teal-500/10 text-emerald-200 ring-emerald-400/40",
    amber: "from-amber-500/25 to-orange-500/10 text-amber-200 ring-amber-400/40",
    rose: "from-rose-500/25 to-pink-500/10 text-rose-200 ring-rose-400/40",
  };

  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1",
              accents[accent]
            )}
          >
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
          {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 text-white shadow-lg shadow-violet-900/40 hover:brightness-110",
    success:
      "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/40 hover:brightness-110",
    danger:
      "bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-lg shadow-rose-900/40 hover:brightness-110",
    outline:
      "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10",
    ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
  };

  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  icon,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
        {icon}
        {label}
        {required ? <span className="text-rose-400">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition hover:border-white/20 focus:border-violet-400/60";

export function Toggle({
  checked,
  onChange,
  label,
  description,
  accent = "violet",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  accent?: "violet" | "emerald" | "amber" | "sky";
}) {
  const accents: Record<string, string> = {
    violet: "bg-violet-500 shadow-violet-500/40",
    emerald: "bg-emerald-500 shadow-emerald-500/40",
    amber: "bg-amber-500 shadow-amber-500/40",
    sky: "bg-sky-500 shadow-sky-500/40",
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "focus-ring relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition",
          checked
            ? cn("border-transparent shadow-lg", accents[accent])
            : "border-white/15 bg-slate-800"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
