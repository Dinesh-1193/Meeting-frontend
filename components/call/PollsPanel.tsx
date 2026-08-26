"use client";

import { useEffect, useMemo, useState } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Check, Plus, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useCallStore } from "@/lib/store/call-store";
import { usePollStore, type ActivePoll, type QaQuestion } from "@/lib/store/poll-store";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import {
  askRoomQuestion,
  closeRoomPoll,
  createRoomPoll,
  listRoomPolls,
  listRoomQuestions,
  markQuestionAnswered,
  upvoteRoomQuestion,
  voteRoomPoll,
} from "@/lib/api/rooms";

interface PollsPanelProps {
  roomId: string;
  isHost?: boolean;
  className?: string;
}

type Message =
  | { type: "start"; poll: ActivePoll }
  | { type: "vote"; pollId: string; optionId: string }
  | { type: "end"; pollId: string }
  | { type: "ask"; question: QaQuestion }
  | { type: "upvote"; questionId: string }
  | { type: "answered"; questionId: string };

export function PollsPanel({ roomId, isHost, className }: PollsPanelProps) {
  const isOpen = useCallStore((s) => s.isPollsOpen);
  const setPollsOpen = useCallStore((s) => s.setPollsOpen);
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();

  const [tab, setTab] = useState<"polls" | "qa">("polls");
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [questionDraft, setQuestionDraft] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  const activePoll = usePollStore((s) => s.activePoll);
  const votes = usePollStore((s) => s.votes);
  const questions = usePollStore((s) => s.questions);
  const upvotes = usePollStore((s) => s.upvotes);
  const startPoll = usePollStore((s) => s.startPoll);
  const castVote = usePollStore((s) => s.castVote);
  const endPoll = usePollStore((s) => s.endPoll);
  const addQuestion = usePollStore((s) => s.addQuestion);
  const toggleUpvote = usePollStore((s) => s.toggleUpvote);
  const markAnswered = usePollStore((s) => s.markAnswered);

  // Fetched once per call — new activity arrives live over the data channel
  // below, so this only ever needs to cover state from before this join.
  const historyQuery = useQuery({
    queryKey: ["polls-qa-history", roomId],
    queryFn: async () => {
      const [polls, qs] = await Promise.all([
        listRoomPolls(roomId),
        listRoomQuestions(roomId),
      ]);
      return { polls, qs };
    },
    staleTime: Infinity,
  });
  const hydratedRef = useState(() => ({ done: false }))[0];
  useEffect(() => {
    if (!historyQuery.data || hydratedRef.done) return;
    hydratedRef.done = true;
    const { polls, qs } = historyQuery.data;
    const latest = polls[polls.length - 1];
    if (latest) {
      startPoll({
        id: latest.id,
        question: latest.question,
        options: latest.options,
        closed: latest.closed,
      });
      for (const [userId, optionId] of Object.entries(latest.votes)) {
        castVote(userId, optionId);
      }
    }
    for (const q of qs) {
      addQuestion({ id: q.id, text: q.text, askedBy: q.askedByName, answered: q.answered });
      for (const uid of q.upvotes) toggleUpvote(q.id, uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyQuery.data]);

  const { send } = useDataChannel("polls-qa", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as Message;
      const from = msg.from?.identity;
      switch (data.type) {
        case "start":
          startPoll(data.poll);
          break;
        case "vote":
          if (from) castVote(from, data.optionId);
          break;
        case "end":
          endPoll();
          break;
        case "ask":
          addQuestion(data.question);
          break;
        case "upvote":
          if (from) toggleUpvote(data.questionId, from);
          break;
        case "answered":
          markAnswered(data.questionId);
          break;
      }
    } catch {
      // ignore malformed payloads
    }
  });

  const broadcast = async (data: Message) => {
    const payload = new TextEncoder().encode(JSON.stringify(data));
    await send(payload, { reliable: true });
  };

  const myVote = votes[localParticipant.identity];

  const tally = useMemo(() => {
    if (!activePoll) return {};
    const counts: Record<string, number> = {};
    for (const opt of activePoll.options) counts[opt.id] = 0;
    for (const optionId of Object.values(votes)) {
      if (counts[optionId] != null) counts[optionId] += 1;
    }
    return counts;
  }, [activePoll, votes]);
  const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);

  const sortedQuestions = useMemo(
    () =>
      [...questions].sort(
        (a, b) => (upvotes[b.id]?.size ?? 0) - (upvotes[a.id]?.size ?? 0),
      ),
    [questions, upvotes],
  );

  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950",
        className,
      )}
      aria-label="Polls and Q&A panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Polls &amp; Q&amp;A</h2>
        <Button variant="ghost" size="sm" onClick={() => setPollsOpen(false)}>
          Close
        </Button>
      </div>

      <div className="flex border-b border-slate-800 text-sm">
        <button
          type="button"
          className={cn(
            "flex-1 px-3 py-2 text-center",
            tab === "polls" ? "border-b-2 border-sky-400 text-slate-100" : "text-slate-400",
          )}
          onClick={() => setTab("polls")}
        >
          Polls
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 px-3 py-2 text-center",
            tab === "qa" ? "border-b-2 border-sky-400 text-slate-100" : "text-slate-400",
          )}
          onClick={() => setTab("qa")}
        >
          Q&amp;A {questions.length ? `(${questions.length})` : ""}
        </button>
      </div>

      {tab === "polls" ? (
        <div className="flex-1 overflow-y-auto p-4">
          {isCreating ? (
            <div className="space-y-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question…"
                className="ms-input"
              />
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, idx) => (idx === i ? e.target.value : o)),
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                    className="ms-input flex-1"
                  />
                  {options.length > 2 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove option"
                      onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              {options.length < 6 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOptions((prev) => [...prev, ""])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add option
                </Button>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !question.trim() || options.filter((o) => o.trim()).length < 2 || isLaunching
                  }
                  isLoading={isLaunching}
                  onClick={async () => {
                    setIsLaunching(true);
                    try {
                      // The server mints the canonical poll/option ids — create it
                      // there first so the id we broadcast matches the persisted row.
                      const created = await createRoomPoll(
                        roomId,
                        question.trim(),
                        options.filter((o) => o.trim()).map((o) => o.trim()),
                      );
                      const poll: ActivePoll = {
                        id: created.id,
                        question: created.question,
                        options: created.options,
                        closed: created.closed,
                      };
                      // LiveKit doesn't echo your own data-channel broadcast back
                      // to you, so the sender needs to apply it locally too —
                      // same reason `vote`/`ask`/`upvote` below update local
                      // state before broadcasting instead of only reacting to it.
                      startPoll(poll);
                      await broadcast({ type: "start", poll });
                      setIsCreating(false);
                      setQuestion("");
                      setOptions(["", ""]);
                    } catch {
                      toast({ variant: "error", title: "Could not launch poll" });
                    } finally {
                      setIsLaunching(false);
                    }
                  }}
                >
                  Launch poll
                </Button>
              </div>
            </div>
          ) : activePoll ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-100">{activePoll.question}</p>
              <div className="space-y-2">
                {activePoll.options.map((opt) => {
                  const count = tally[opt.id] ?? 0;
                  const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                  const isMine = myVote === opt.id;
                  const showResults = Boolean(myVote) || activePoll.closed;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={showResults}
                      onClick={() => {
                        castVote(localParticipant.identity, opt.id);
                        void broadcast({ type: "vote", pollId: activePoll.id, optionId: opt.id });
                        void voteRoomPoll(roomId, activePoll.id, opt.id).catch(() => {});
                      }}
                      className={cn(
                        "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm",
                        isMine ? "border-sky-500" : "border-slate-700",
                        showResults ? "cursor-default" : "hover:bg-slate-900",
                      )}
                    >
                      {showResults ? (
                        <span
                          className="absolute inset-y-0 left-0 bg-sky-500/20"
                          style={{ width: `${pct}%` }}
                        />
                      ) : null}
                      <span className="relative flex items-center justify-between text-slate-100">
                        <span className="flex items-center gap-1.5">
                          {isMine ? <Check className="h-3.5 w-3.5 text-sky-400" /> : null}
                          {opt.text}
                        </span>
                        {showResults ? (
                          <span className="text-xs text-slate-400">
                            {count} · {pct}%
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                {totalVotes} vote{totalVotes === 1 ? "" : "s"}
                {activePoll.closed ? " · Poll closed" : ""}
              </p>
              {isHost && !activePoll.closed ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    endPoll();
                    void broadcast({ type: "end", pollId: activePoll.id });
                    void closeRoomPoll(roomId, activePoll.id).catch(() => {});
                  }}
                >
                  End poll
                </Button>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No active poll"
              description={isHost ? "Create a poll to get instant feedback." : "The host hasn't started a poll yet."}
            />
          )}

          {isHost && !isCreating && !activePoll ? (
            <Button className="mt-3 w-full" size="sm" onClick={() => setIsCreating(true)}>
              <BarChart3 className="h-3.5 w-3.5" />
              Create poll
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <form
            className="flex gap-2 border-b border-slate-800 p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const text = questionDraft.trim();
              if (!text) return;
              setIsAsking(true);
              try {
                // Same reasoning as poll creation — get the server-minted id first.
                const created = await askRoomQuestion(roomId, text);
                const q: QaQuestion = {
                  id: created.id,
                  text: created.text,
                  askedBy: created.askedByName,
                  answered: created.answered,
                };
                addQuestion(q);
                await broadcast({ type: "ask", question: q });
                setQuestionDraft("");
              } catch {
                toast({ variant: "error", title: "Could not send question" });
              } finally {
                setIsAsking(false);
              }
            }}
          >
            <input
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              placeholder="Ask a question…"
              className="ms-input flex-1"
            />
            <Button type="submit" size="sm" disabled={!questionDraft.trim() || isAsking} isLoading={isAsking}>
              Ask
            </Button>
          </form>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {!sortedQuestions.length ? (
              <EmptyState title="No questions yet" description="Questions from anyone will show up here." />
            ) : (
              sortedQuestions.map((q) => {
                const count = upvotes[q.id]?.size ?? 0;
                const iUpvoted = upvotes[q.id]?.has(localParticipant.identity) ?? false;
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "rounded-lg border border-slate-800 p-2.5",
                      q.answered && "opacity-60",
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm text-slate-100",
                        q.answered && "line-through",
                      )}
                    >
                      {q.text}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>{q.askedBy}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                            iUpvoted ? "bg-sky-500/20 text-sky-300" : "hover:bg-slate-800",
                          )}
                          onClick={() => {
                            toggleUpvote(q.id, localParticipant.identity);
                            void broadcast({ type: "upvote", questionId: q.id });
                            void upvoteRoomQuestion(roomId, q.id).catch(() => {});
                          }}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {count}
                        </button>
                        {isHost && !q.answered ? (
                          <button
                            type="button"
                            className="rounded-full p-1 hover:bg-slate-800"
                            aria-label="Mark answered"
                            onClick={() => {
                              markAnswered(q.id);
                              void broadcast({ type: "answered", questionId: q.id });
                              void markQuestionAnswered(roomId, q.id).catch(() => {});
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
