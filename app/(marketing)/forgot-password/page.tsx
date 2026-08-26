"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/lib/api";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => forgotPassword(values.email),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Check your email",
        description: "If an account exists, a reset link is on the way.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Request failed",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  return (
    <AuthSplitLayout
      title="Reset password"
      subtitle="We'll email you a link to choose a new password."
    >
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
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Send reset link
        </Button>
        <p className="ms-text-muted text-center text-sm">
          <Link href="/login" className="font-medium text-[var(--accent)]">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
