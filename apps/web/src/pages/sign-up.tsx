import { SignUp } from "@clerk/clerk-react";

export function SignUpPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-base-100">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
