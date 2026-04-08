import { SignIn } from "@clerk/clerk-react";

export function SignInPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-base-100">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
