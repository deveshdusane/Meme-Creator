import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VideoToGif } from "@/components/VideoToGif";

export default function VideoPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={16} /> Back to browse
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Video → GIF</h1>
        <p className="mt-1 text-muted">
          Upload a video, trim it, add a caption, and export a looping GIF with
          the real footage. Runs in your browser — free, nothing uploaded.
        </p>
      </div>

      <VideoToGif />
    </div>
  );
}
