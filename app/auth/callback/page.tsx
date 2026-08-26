"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { exchangeGoogleSession } from "@/lib/api";
import { LoadingState } from "@/components/ui/states";
import { useToast } from "@/lib/hooks/use-toast";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!supabaseUrl || !supabaseAnon) {
        setError("Supabase is not configured on the frontend.");
        return;
      }
      const supabase = createClient(supabaseUrl, supabaseAnon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        // Hash fragment flow
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (!accessToken) {
          setError(sessionError?.message ?? "No OAuth session found");
          return;
        }
        await exchangeGoogleSession({
          accessToken,
          refreshToken: refreshToken ?? undefined,
        });
        window.location.assign("/dashboard");
        return;
      }

      await exchangeGoogleSession({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
      window.location.assign("/dashboard");
    }

    void run().catch((err) => {
      setError(err instanceof Error ? err.message : "OAuth failed");
      toast({ variant: "error", title: "Sign-in failed", description: String(err) });
    });
  }, [router, toast]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="ms-text-heading font-semibold">Could not complete sign-in</p>
        <p className="ms-text-muted text-sm">{error}</p>
        <a href="/login" className="text-[var(--accent)]">
          Back to login
        </a>
      </div>
    );
  }

  return <LoadingState className="min-h-screen" label="Finishing sign-in…" />;
}
