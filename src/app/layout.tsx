import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "ApplyPilot — AI job application autopilot",
  description:
    "Paste a job description, let the AI score the fit and draft the application email, then send it with your CV attached.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(12, 17, 34, 0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e8ecff",
            },
          }}
        />
      </body>
    </html>
  );
}
