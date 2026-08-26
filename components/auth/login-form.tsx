"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { exchangeGoogleSession, login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { GoogleSignInButton } from "./google-sign-in-button";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      toast({ variant: "success", title: "Welcome back" });
      window.location.assign("/dashboard");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to sign in. Try again.";
      toast({ variant: "error", title: "Login failed", description: message });
    },
  });

  const googleMutation = useMutation({
    mutationFn: exchangeGoogleSession,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      toast({ variant: "success", title: "Welcome back" });
      window.location.assign("/dashboard");
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Google sign-in failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        Sign in
      </Button>
      <GoogleSignInButton
        isLoading={googleMutation.isPending}
        onTokens={(tokens) => googleMutation.mutate(tokens)}
      />
      <p className="ms-text-muted text-center text-sm">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
