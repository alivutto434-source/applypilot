import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Local-first storage for the master CV PDF.
 * Files live in .data/cv/ (git-ignored). Swap this module for S3/Supabase
 * Storage later without touching the pipeline.
 */
const CV_DIR = path.join(process.cwd(), ".data", "cv");
const PDF_NAME = "master-cv.pdf";
const META = path.join(CV_DIR, "meta.json");

export type StoredCv = {
  fileName: string;
  size: number;
  uploadedAt: string;
};

export async function ensureCvDir() {
  await fs.mkdir(CV_DIR, { recursive: true });
}

export async function saveCv(bytes: Buffer, originalName: string): Promise<StoredCv> {
  await ensureCvDir();
  await fs.writeFile(path.join(CV_DIR, PDF_NAME), bytes);
  const meta: StoredCv = {
    fileName: originalName || "master-cv.pdf",
    size: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
  };
  await fs.writeFile(META, JSON.stringify(meta, null, 2));
  return meta;
}

export async function readCv(): Promise<{ bytes: Buffer; meta: StoredCv } | null> {
  try {
    const [bytes, raw] = await Promise.all([
      fs.readFile(path.join(CV_DIR, PDF_NAME)),
      fs.readFile(META, "utf8").catch(() => null),
    ]);
    const meta: StoredCv = raw
      ? JSON.parse(raw)
      : { fileName: PDF_NAME, size: bytes.byteLength, uploadedAt: "" };
    return { bytes, meta };
  } catch {
    return null;
  }
}

export async function cvExists() {
  try {
    await fs.access(path.join(CV_DIR, PDF_NAME));
    return true;
  } catch {
    return false;
  }
}

export async function deleteCv() {
  await fs.rm(path.join(CV_DIR, PDF_NAME), { force: true });
  await fs.rm(META, { force: true });
}
