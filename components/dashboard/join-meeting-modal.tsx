"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractRoomId, meetingLobbyPath } from "@/lib/utils/format";

interface JoinMeetingModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinMeetingModal({ open, onClose }: JoinMeetingModalProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  return (
    <Modal open={open} onClose={onClose} title="Join a meeting">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const id = extractRoomId(code);
          if (!id) {
            setError("Enter a valid meeting ID or invite link.");
            return;
          }
          onClose();
          const path = meetingLobbyPath(id);
          router.push(name.trim() ? `${path}?name=${encodeURIComponent(name.trim())}` : path);
        }}
      >
        <Input
          label="Meeting ID or invite link"
          placeholder="e.g. k7m-2xq9-p1a or paste the full invite URL"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          error={error}
          autoFocus
        />
        <Input
          label="Display name (optional)"
          placeholder="How others will see you"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Join meeting</Button>
        </div>
      </form>
    </Modal>
  );
}
