import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--wash)] px-4 py-16">
      <Suspense
        fallback={
          <div className="h-64 w-full max-w-md animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
