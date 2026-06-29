import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateStudio } from "@/components/create/CreateStudio";

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={16} /> Back to browse
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Create with AI</h1>
        <p className="mt-1 text-muted">
          Upload an image or video, write a prompt, pick a type — AI generates a
          shareable result. Free, no signup (Pollinations); add a Cloudflare key
          for vision analysis.
        </p>
      </div>

      <CreateStudio />
    </div>
  );
}
