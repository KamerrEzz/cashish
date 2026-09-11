"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "@/components/ui";

export function SubmitButton({
  children,
  className = btnPrimary,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? "Guardando…" : children}
    </button>
  );
}
