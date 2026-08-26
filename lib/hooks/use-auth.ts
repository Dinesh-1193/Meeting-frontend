"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccessToken, getMe, logout as apiLogout } from "@/lib/api";
import type { User } from "@/types";

export function useAuth(options?: { required?: boolean }) {
  const required = options?.required ?? false;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Wait until client has read token from storage before redirecting.
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getAccessToken()));
    setReady(true);
  }, []);

  const query = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    enabled: ready && hasToken,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!required || !ready) return;

    if (!hasToken) {
      router.replace("/login");
      return;
    }

    if (query.isError) {
      router.replace("/login");
    }
  }, [required, ready, hasToken, query.isError, router]);

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.clear();
    setHasToken(false);
    router.replace("/login");
  }, [queryClient, router]);

  const isLoading = !ready || (hasToken && (query.isLoading || query.isFetching) && !query.data);

  return {
    user: query.data ?? null,
    isLoading,
    isAuthenticated: Boolean(query.data),
    error: query.error,
    logout,
    refetch: query.refetch,
    /** Call after login/signup so protected pages see the token immediately. */
    markAuthenticated: (user?: User) => {
      setHasToken(true);
      setReady(true);
      if (user) {
        queryClient.setQueryData(["auth", "me"], user);
      }
    },
  };
}
