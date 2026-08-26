"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/lib/api";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string().min(6),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<{ accessToken: string; refreshToken?: string } | null>(
    null,
  );

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash || window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? undefined;
    if (accessToken) setTokens({ accessToken, refreshToken });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => {
      if (!tokens) throw new Error("Missing reset token");
      return resetPassword({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        password: values.password,
      });
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Password updated" });
      window.location.assign("/login");
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Reset failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  return (
    <AuthSplitLayout
      title="Choose a new password"
      subtitle="Enter a new password for your MeetSpace account."
    >
      {!tokens ? (
        <p className="ms-text-muted text-sm">
          Open the reset link from your email to continue.{" "}
          <Link href="/forgot-password" className="text-[var(--accent)]">
            Request a new link
          </Link>
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register("confirm")}
          />
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>
            Update password
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
