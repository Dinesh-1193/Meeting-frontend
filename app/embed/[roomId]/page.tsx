"use client";

import { Suspense } from "react";
import EmbedMeetingInner from "./embed-inner";
import { LoadingState } from "@/components/ui/states";

export default function EmbedMeetingPage() {
  return (
    <Suspense
      fallback={
        <LoadingState className="min-h-screen bg-slate-950 text-slate-400" label="Joining…" />
      }
    >
      <EmbedMeetingInner />
    </Suspense>
  );
}
