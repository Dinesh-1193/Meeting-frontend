"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createGuestSession,
  getAccessToken,
  getJoinRequestStatus,
  getMe,
  getRoom,
  getRoomToken,
  requestToJoin,
} from "@/lib/api";
import { PreJoinLobby, WaitingRoomScreen } from "@/components/call";
import { LoadingState } from "@/components/ui/states";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

type Stage = "device-preview" | "waiting" | "denied";

export default function LobbyPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [stage, setStage] = useState<Stage>("device-preview");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const participantIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setReady(true);
        }
        return;
      }
      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    enabled: Boolean(roomId) && Boolean(getAccessToken()),
    retry: 1,
  });

  // Public room peek without auth — fall back to room id label when unauthenticated
  const needsGuest = ready && !user;

  const tokenMutation = useMutation({
    mutationFn: ({
      displayName,
      passcode,
    }: {
      displayName: string;
      passcode: string;
    }) => getRoomToken(roomId, displayName, passcode || undefined),
  });

  const completeJoin = async (options: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    passcode: string;
    displayName: string;
  }) => {
    const tokenRes = await tokenMutation.mutateAsync({
      displayName: options.displayName,
      passcode: options.passcode,
    });
    const payload = {
      token: tokenRes.token,
      serverUrl: tokenRes.serverUrl,
      isHost: tokenRes.isHost,
      role: tokenRes.role,
      mode: tokenRes.mode,
      audioEnabled: tokenRes.forceMuted ? false : options.audioEnabled,
      videoEnabled: options.videoEnabled,
    };
    if (tokenRes.forceMuted && options.audioEnabled) {
      toast({
        variant: "info",
        title: "You've been muted",
        description: "The host mutes everyone on entry for this meeting.",
      });
    }
    sessionStorage.setItem(`meeting-join:${roomId}`, JSON.stringify(payload));
    router.push(`/meeting/${roomId}`);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (!ready) {
    return <LoadingState className="min-h-screen bg-slate-950 text-slate-400" label="Loading…" />;
  }

  if (stage === "waiting" || stage === "denied") {
    return (
      <WaitingRoomScreen
        roomName={roomQuery.data?.name}
        status={stage === "denied" ? "denied" : "pending"}
        onCancel={() => {
          if (pollRef.current) clearInterval(pollRef.current);
          router.push(user && !user.isGuest ? "/dashboard" : "/");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {user && roomQuery.isLoading ? (
        <LoadingState className="min-h-screen" label="Loading room…" />
      ) : user && roomQuery.isError ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-slate-300">
            {(roomQuery.error as ApiError)?.message ||
              "This meeting could not be found."}
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push(user.isGuest ? "/" : "/dashboard")}
          >
            Back
          </Button>
        </div>
      ) : (
        <PreJoinLobby
          roomName={roomQuery.data?.name || `Room ${roomId}`}
          displayName={user?.name ?? ""}
          allowEditDisplayName={needsGuest || Boolean(user?.isGuest)}
          requiresPasscode={Boolean(roomQuery.data?.hasPasscode)}
          passcodeError={passcodeError}
          isJoining={isJoining}
          onJoin={async (options) => {
            setIsJoining(true);
            setPasscodeError(null);
            try {
              if (!getAccessToken()) {
                await createGuestSession({
                  roomId,
                  displayName: options.displayName,
                  passcode: options.passcode || undefined,
                });
                setUser({
                  id: "guest",
                  email: "",
                  name: options.displayName,
                  isGuest: true,
                });
              }

              const joinReq = await requestToJoin(roomId, options.displayName);
              if (joinReq.status === "pending") {
                participantIdRef.current = joinReq.participantId;
                setStage("waiting");
                pollRef.current = setInterval(async () => {
                  try {
                    const current = await getJoinRequestStatus(
                      roomId,
                      joinReq.participantId,
                    );
                    if (current.status === "admitted") {
                      if (pollRef.current) clearInterval(pollRef.current);
                      try {
                        await completeJoin(options);
                      } catch (err) {
                        const message =
                          err instanceof ApiError
                            ? err.message
                            : "Failed to join meeting.";
                        toast({
                          variant: "error",
                          title: "Could not join",
                          description: message,
                        });
                        setStage("device-preview");
                        setIsJoining(false);
                      }
                    } else if (current.status === "denied") {
                      if (pollRef.current) clearInterval(pollRef.current);
                      setStage("denied");
                    }
                  } catch {
                    // transient network error — keep polling
                  }
                }, 3000);
                return;
              }

              await completeJoin(options);
            } catch (err) {
              const message =
                err instanceof ApiError
                  ? err.message
                  : "Failed to join meeting.";
              if (err instanceof ApiError && err.status === 401) {
                setPasscodeError(message);
              } else {
                toast({
                  variant: "error",
                  title: "Could not join",
                  description: message,
                });
              }
              setIsJoining(false);
            }
          }}
        />
      )}
    </div>
  );
}
