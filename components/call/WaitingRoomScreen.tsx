"use client";

import { Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaitingRoomScreenProps {
  roomName?: string;
  status: "pending" | "denied";
  onCancel: () => void;
}

export function WaitingRoomScreen({ roomName, status, onCancel }: WaitingRoomScreenProps) {
  const denied = status === "denied";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
      {denied ? (
        <XCircle className="h-10 w-10 text-red-400" />
      ) : (
        <Clock3 className="h-10 w-10 animate-pulse text-sky-400" />
      )}
      <h1 className="text-xl font-semibold text-slate-50">
        {denied ? "You weren't admitted" : "Waiting for the host"}
      </h1>
      <p className="text-sm text-slate-400">
        {denied
          ? `The host didn't admit you into ${roomName || "this meeting"}.`
          : `${roomName || "This meeting"} has a waiting room enabled. You'll join automatically once the host lets you in.`}
      </p>
      <Button variant="secondary" onClick={onCancel}>
        {denied ? "Back to dashboard" : "Cancel"}
      </Button>
    </div>
  );
}
