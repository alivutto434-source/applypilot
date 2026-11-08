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
        icon={<FileText className="size-4" />}
        title="Master CV (PDF)"
        hint="Stored locally in .data/cv and attached when the “attach CV PDF” flag is on."
        accent="amber"
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={`rounded-[4px] border border-dashed p-5 text-center transition ${
          dragging
            ? "border-[#7c6cf5] bg-[#1c1830]"
            : "border-[#33333c] bg-[#131316] hover:border-[#46464f]"
        }`}
      >
        <UploadCloud className="mx-auto size-6 text-[#b9aaff]" />
        <p className="mt-1.5 text-[12.5px] font-semibold text-white">
          {busy ? "Working…" : "Drop your CV PDF here"}
        </p>
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
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <p className="mt-1.5 text-[10.5px] text-[#6b6b76]">PDF only · max 8 MB</p>
      </div>

      {onDisk ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#21483a] bg-[#132e23] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-[#c6f3d8]">
              {meta?.fileName || "master-cv.pdf"}
            </p>
            <p className="text-[10.5px] text-[#6ee7a8]">
              {meta?.size ? `${Math.round(meta.size / 1024)} KB · ` : ""}ready to attach
            </p>
          </div>
          <div className="flex gap-1">
            <a href="/api/cv" target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" type="button">
                <Download className="size-3" /> View
              </Button>
            </a>
            <Button variant="ghost" size="sm" type="button" onClick={() => void remove()}>
              <Trash2 className="size-3 text-[#ff9aa8]" />
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
