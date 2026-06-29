import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Meme Creator — AI memes, GIFs & stickers",
  description:
    "Browse GIFs, stickers and memes, or create your own with AI. Upload an image or video, add a prompt, get a shareable meme.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                  <Sparkles size={18} />
                </span>
                <span>Meme Creator</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/video"
                  className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg sm:inline-block"
                >
                  Video → GIF
                </Link>
                <Link
                  href="/gallery"
                  className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
                >
                  Gallery
                </Link>
                <Link
                  href="/create"
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Create with AI
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-muted">
            Browse content Powered by GIPHY · AI Create coming in Phase 3
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
