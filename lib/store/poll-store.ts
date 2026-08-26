import { create } from "zustand";

export interface PollOption {
  id: string;
  text: string;
}

export interface ActivePoll {
  id: string;
  question: string;
  options: PollOption[];
  closed: boolean;
}

export interface QaQuestion {
  id: string;
  text: string;
  askedBy: string;
  answered: boolean;
}

interface PollState {
  activePoll: ActivePoll | null;
  /** identity -> optionId, rebuilt live from broadcast votes (works for every viewer, not just the host). */
  votes: Record<string, string>;
  questions: QaQuestion[];
  /** questionId -> Set of identities who upvoted */
  upvotes: Record<string, Set<string>>;

  startPoll: (poll: ActivePoll) => void;
  castVote: (identity: string, optionId: string) => void;
  endPoll: () => void;
  clearPoll: () => void;

  addQuestion: (q: QaQuestion) => void;
  toggleUpvote: (questionId: string, identity: string) => void;
  markAnswered: (questionId: string) => void;

  reset: () => void;
}

const initialState = {
  activePoll: null as ActivePoll | null,
  votes: {} as Record<string, string>,
  questions: [] as QaQuestion[],
  upvotes: {} as Record<string, Set<string>>,
};

export const usePollStore = create<PollState>((set) => ({
  ...initialState,
  startPoll: (poll) => set({ activePoll: poll, votes: {} }),
  castVote: (identity, optionId) =>
    set((state) => ({ votes: { ...state.votes, [identity]: optionId } })),
  endPoll: () =>
    set((state) => ({
      activePoll: state.activePoll ? { ...state.activePoll, closed: true } : null,
    })),
  clearPoll: () => set({ activePoll: null, votes: {} }),

  addQuestion: (q) =>
    set((state) => ({
      questions: state.questions.some((existing) => existing.id === q.id)
        ? state.questions
        : [q, ...state.questions],
    })),
  toggleUpvote: (questionId, identity) =>
    set((state) => {
      const current = new Set(state.upvotes[questionId] ?? []);
      if (current.has(identity)) current.delete(identity);
      else current.add(identity);
      return { upvotes: { ...state.upvotes, [questionId]: current } };
    }),
  markAnswered: (questionId) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === questionId ? { ...q, answered: true } : q,
      ),
    })),

  reset: () => set(initialState),
}));
