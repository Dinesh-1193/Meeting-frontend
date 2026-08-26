import { LoginForm } from "@/components/auth/login-form";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";

export default function LoginPage() {
  return (
    <AuthSplitLayout title="Welcome back" subtitle="Access your meetings and rooms.">
      <LoginForm />
    </AuthSplitLayout>
  );
}
