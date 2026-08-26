"use client";

import { Suspense } from "react";
import { ChatView } from "@/components/dashboard/chat/chat-view";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}
