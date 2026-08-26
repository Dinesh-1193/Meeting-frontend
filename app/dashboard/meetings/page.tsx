"use client";

import { Suspense } from "react";
import { MeetingsView } from "@/components/dashboard/meetings-view";
import { LoadingState } from "@/components/ui/states";

export default function MeetingsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading meetings…" />}>
      <MeetingsView />
    </Suspense>
  );
}
