"use client";

import { Bookmark, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { saveCreation } from "@/lib/gallery";

// getBlob() returns the bytes to store; called only when the user clicks Save.
export function SaveButton({
  type,
  ext,
  getBlob,
}: {
  type: string;
  ext: string;
  getBlob: () => Promise<Blob | null>;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function save() {
    setState("saving");
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("no blob");
      await saveCreation(type, ext, blob);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  }

  return (
    <button
      onClick={save}
      disabled={state === "saving"}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-brand disabled:opacity-60"
    >
      {state === "saving" ? (
        <Loader2 size={16} className="animate-spin" />
      ) : state === "saved" ? (
        <Check size={16} className="text-brand" />
      ) : (
        <Bookmark size={16} />
      )}
      {state === "saved" ? "Saved" : state === "error" ? "Failed" : "Save to gallery"}
    </button>
  );
}
