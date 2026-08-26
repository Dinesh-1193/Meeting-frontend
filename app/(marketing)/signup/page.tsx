import { SignupForm } from "@/components/auth/signup-form";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";

export default function SignupPage() {
  return (
    <AuthSplitLayout
      title="Create account"
      subtitle="Start hosting meetings in minutes."
    >
      <SignupForm />
    </AuthSplitLayout>
  );
}
