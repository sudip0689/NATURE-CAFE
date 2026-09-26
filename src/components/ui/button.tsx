import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "paid";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-forest text-white hover:bg-leaf active:bg-forest disabled:bg-brandline",
  secondary:
    "bg-white text-brandink border border-brandline hover:bg-ivory active:bg-mint",
  ghost: "bg-transparent text-brandink hover:bg-mint active:bg-brandline",
  danger:
    "bg-alert-500 text-white hover:bg-alert-600 active:bg-alert-600 disabled:bg-alert-500/40",
  // Reserved for the one green moment: confirming that money arrived.
  paid: "bg-leaf text-white hover:bg-forest active:bg-forest disabled:bg-leaf/40",
};

const SIZES: Record<Size, string> = {
  md: "min-h-touch px-4 text-base",
  lg: "min-h-touch-lg px-6 text-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** Shows the pending label and blocks the double-tap that would double-bill. */
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  pending = false,
  pendingLabel,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // A counter gets double-tapped constantly. Locking the button while a
      // submit is in flight is the cheapest half of duplicate-bill prevention;
      // the server-side half arrives with the Phase 4 RPC.
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-70",
        "select-none touch-manipulation",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {pending ? <Spinner /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/**
 * Shown while a button is locked.
 *
 * Without it a disabled button with changed text reads as a button that has
 * stopped working — the thermal printer can take several seconds to connect,
 * and the counter needs to see that something is still happening.
 */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
