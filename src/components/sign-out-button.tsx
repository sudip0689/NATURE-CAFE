"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      onClick={() => startTransition(() => void signOut())}
      pending={pending}
      pendingLabel="Signing out…"
    >
      Sign out
    </Button>
  );
}
