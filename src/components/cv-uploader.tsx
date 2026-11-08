"use client";

import * as React from "react";
import { Download, FileText, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, SectionHeading } from "@/components/ui";

type CvMeta = { fileName: string; size: number; uploadedAt: string };

export function CvUploader({ initial }: { initial: { onDisk: boolean; meta?: CvMeta } }) {
  const [meta, setMeta] = React.useState<CvMeta | undefined>(initial.meta);
  const [onDisk, setOnDisk] = React.useState(initial.onDisk);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files, please");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMeta(data.cv);
      setOnDisk(true);
      toast.success("CV uploaded — it will be attached to outgoing emails");
      window.dispatchEvent(new Event("applypilot:refresh"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await fetch("/api/cv", { method: "DELETE" });
      setMeta(undefined);
      setOnDisk(false);
      toast.success("CV removed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionHeading
        icon={<FileText className="size-5" />}
        title="Master CV (PDF)"
        hint="Stored locally in .data/cv and attached to every email."
        accent="amber"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragging
            ? "border-violet-400/70 bg-violet-500/10"
            : "border-white/15 bg-white/[0.02] hover:border-white/25"
        }`}
      >
        <UploadCloud className="mx-auto size-8 text-violet-300" />
        <p className="mt-2 text-sm font-semibold text-white">
          {busy ? "Working…" : "Drop your CV PDF here"}
        </p>
        <p className="text-xs text-slate-400">or</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => inputRef.current?.click()}
          loading={busy}
        >
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <p className="mt-2 text-[11px] text-slate-500">PDF only · max 8 MB</p>
      </div>

      {onDisk ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-emerald-100">
              {meta?.fileName || "master-cv.pdf"}
            </p>
            <p className="text-[11px] text-emerald-200/70">
              {meta?.size ? `${Math.round(meta.size / 1024)} KB · ` : ""}
              ready to attach
            </p>
          </div>
          <div className="flex gap-1">
            <a href="/api/cv" target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" type="button">
                <Download className="size-3.5" /> View
              </Button>
            </a>
            <Button variant="ghost" size="sm" type="button" onClick={() => void remove()}>
              <Trash2 className="size-3.5 text-rose-300/80" />
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
