"use client";

/**
 * Whatever went wrong, the counter still has customers waiting.
 *
 * Without this boundary a thrown server error reaches the browser as Next's
 * bare "A server error occurred. Reload to try again." plus a digest number,
 * which tells a cashier nothing and tells whoever they call almost nothing.
 * This keeps the digest — it is the key to the line in the Vercel runtime
 * logs — but puts a readable sentence and a way out around it.
 *
 * Deliberately not styled as a full redesign: same ivory, forest and caramel
 * the rest of the app uses.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory px-6 text-center text-brandink">
      <div>
        <p className="font-display text-xl font-bold tracking-[-0.01em]">
          <span className="text-forest">Nature</span>{" "}
          <span className="text-caramel">Caffe</span>
        </p>
        <p className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-brandmuted">
          Something went wrong
        </p>
      </div>

      <p className="max-w-xs text-sm leading-relaxed text-brandmuted">
        This screen could not load. Your saved bills are not affected — nothing
        is written unless a bill is confirmed.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-touch-lg w-full items-center justify-center rounded-control bg-forest px-5 text-base font-medium text-white transition-colors hover:bg-leaf"
        >
          Try again
        </button>
        <a
          href="/login"
          className="flex min-h-touch w-full items-center justify-center rounded-control border border-brandline bg-white px-5 text-base font-medium text-brandink transition-colors hover:bg-mint"
        >
          Back to start
        </a>
      </div>

      {/* The one thing worth reading out over the phone. */}
      {error.digest ? (
        <p className="tabular text-[0.7rem] text-brandmuted/80">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
