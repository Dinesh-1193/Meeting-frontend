"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface GoogleSignInButtonProps {
  isLoading?: boolean;
  onTokens: (tokens: { accessToken: string; refreshToken?: string }) => void;
}

export function GoogleSignInButton({ isLoading, onTokens }: GoogleSignInButtonProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!supabaseUrl || !supabaseAnon) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      isLoading={busy || isLoading}
      onClick={async () => {
        setBusy(true);
        try {
          const supabase = createClient(supabaseUrl, supabaseAnon, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              skipBrowserRedirect: false,
            },
          });
          if (error) throw error;
          if (!data.url) {
            toast({
              variant: "error",
              title: "Google sign-in unavailable",
              description: "Enable Google provider in Supabase Auth settings.",
            });
          }
          // Browser redirects to Google — onTokens used from /auth/callback
          void onTokens;
        } catch (err) {
          toast({
            variant: "error",
            title: "Google sign-in failed",
            description: err instanceof Error ? err.message : "Try again",
          });
          setBusy(false);
        }
      }}
    >
      Continue with Google
    </Button>
  );
}
