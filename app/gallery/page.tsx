import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GalleryGrid } from "@/components/GalleryGrid";

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={16} /> Back to browse
      </Link>

      <div>
        <h1 className="text-2xl font-bold">My gallery</h1>
        <p className="mt-1 text-muted">
          Your saved creations, stored locally in this browser. Nothing is
          uploaded — clearing browser data removes them.
        </p>
      </div>

      <GalleryGrid />
    </div>
  );
}
