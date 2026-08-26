"use client";

import { Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRaiseHand } from "@/lib/hooks/use-raise-hand";
import { cn } from "@/lib/utils/cn";

interface RaiseHandButtonProps {
  /** Renders as a light Material menu row instead of a round toolbar button. */
  asMenuItem?: boolean;
  onToggle?: () => void;
}

export function RaiseHandButton({ asMenuItem, onToggle }: RaiseHandButtonProps = {}) {
  const { isHandRaised, toggle } = useRaiseHand();

  const handleClick = async () => {
    await toggle();
    onToggle?.();
  };

  if (asMenuItem) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100"
        onClick={() => void handleClick()}
        aria-pressed={isHandRaised}
      >
        <Hand className={cn("h-4 w-4", isHandRaised ? "text-[#1a73e8]" : "text-gray-500")} />
        {isHandRaised ? "Lower hand" : "Raise hand"}
      </button>
    );
  }

  return (
    <Button
      variant={isHandRaised ? "primary" : "secondary"}
      size="icon"
      className="rounded-full"
      onClick={() => void handleClick()}
      aria-pressed={isHandRaised}
      aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
    >
      <Hand className={cn("h-4 w-4", isHandRaised && "animate-pulse")} />
    </Button>
  );
}
