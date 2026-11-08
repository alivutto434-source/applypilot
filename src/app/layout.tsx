import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ApplyPilot — AI job application autopilot",
  description:
    "Paste a job description, let the AI score the fit and draft the application email, then send it with your CV and rich signature.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#17171a",
              border: "1px solid #2a2a30",
              borderRadius: "4px",
              color: "#e8e8ea",
              fontFamily: "inherit",
            },
          }}
        />
      </body>
    </html>
  );
}
