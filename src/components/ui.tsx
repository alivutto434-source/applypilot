"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel p-5", className)} {...props}>
      {children}
    </div>
  );
}

const ACCENTS = {
  violet: { box: "bg-[#241f3d] text-[#b9aaff] border-[#3b3263]", bar: "bg-[#7c6cf5]" },
  sky: { box: "bg-[#152a3d] text-[#8ec5ff] border-[#26405c]", bar: "bg-[#3b82f6]" },
  emerald: { box: "bg-[#132e23] text-[#6ee7a8] border-[#21483a]", bar: "bg-[#17a34a]" },
  amber: { box: "bg-[#332612] text-[#f2c15c] border-[#4d3a1a]", bar: "bg-[#d97706]" },
  rose: { box: "bg-[#331a1f] text-[#ff9aa8] border-[#4d2730]", bar: "bg-[#dc2626]" },
};

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
  accent?: keyof typeof ACCENTS;
  action?: React.ReactNode;
}) {
  const tone = ACCENTS[accent];

  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[4px] border",
              tone.box
            )}
          >
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-white">
            {title}
          </h2>
          {hint ? <p className="mt-0.5 text-[11.5px] leading-snug text-[#9898a2]">{hint}</p> : null}
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
    primary: "bg-[#7c6cf5] text-white hover:bg-[#6f5ee8] active:bg-[#6455d6]",
    success: "bg-[#17a34a] text-white hover:bg-[#158f42]",
    danger: "bg-[#dc2626] text-white hover:bg-[#c22020]",
    outline:
      "border border-[#2a2a30] bg-[#1b1b1f] text-[#dcdce2] hover:border-[#3a3a44] hover:bg-[#23232a]",
    ghost: "text-[#b9b9c2] hover:bg-[#23232a] hover:text-white",
  };

  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-[4px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "px-2.5 py-1.5 text-[11.5px]" : "px-3.5 py-2 text-[13px]",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-3 animate-spin rounded-[2px] border-2 border-white/40 border-t-white" />
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
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#a8a8b3]">
        {icon}
        {label}
        {required ? <span className="text-[#ff7b8a]">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11.5px] font-medium text-[#ff8a97]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11.5px] text-[#77777f]">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-[4px] border border-[#2a2a30] bg-[#131316] px-3 py-2 text-[13px] text-[#e8e8ea] placeholder:text-[#6b6b76] transition hover:border-[#3a3a44] focus:border-[#7c6cf5]";

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
    violet: "bg-[#7c6cf5]",
    emerald: "bg-[#17a34a]",
    amber: "bg-[#d97706]",
    sky: "bg-[#2563eb]",
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-[4px] border border-[#2a2a30] bg-[#131316] p-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11.5px] leading-snug text-[#8c8c96]">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "focus-ring relative mt-0.5 h-5 w-9 shrink-0 rounded-[3px] border transition",
          checked ? cn("border-transparent", accents[accent]) : "border-[#33333c] bg-[#26262c]"
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] size-4 rounded-[2px] bg-white transition-all",
            checked ? "left-[19px]" : "left-[2px]"
          )}
        />
      </button>
    </div>
  );
}
