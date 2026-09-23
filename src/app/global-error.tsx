"use client";

/**
 * The outermost net.
 *
 * error.tsx cannot catch a throw that happens inside a layout — and the one
 * failure that actually reached production did exactly that: owner/layout.tsx
 * builds a Supabase client before any page renders, so a misconfigured
 * environment took the whole document down and the browser fell back to
 * "A server error occurred. Reload to try again." with a bare digest.
 *
 * global-error replaces the document, so it catches that case. It ships its
 * own <html>/<body> because by definition the root layout is gone, and it
 * inlines its colours because globals.css may not have loaded either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "0 1.5rem",
          textAlign: "center",
          background: "#f7efe6",
          color: "#2f2013",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
            <span style={{ color: "#0e5a35" }}>Nature</span>{" "}
            <span style={{ color: "#b87532" }}>Caffe</span>
          </p>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.6rem",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7a6a5c",
            }}
          >
            Something went wrong
          </p>
        </div>

        <p
          style={{
            margin: 0,
            maxWidth: "20rem",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "#7a6a5c",
          }}
        >
          This screen could not load. Your saved bills are not affected —
          nothing is written unless a bill is confirmed.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            width: "100%",
            maxWidth: "20rem",
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "3rem",
              borderRadius: "0.75rem",
              border: 0,
              background: "#0e5a35",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/login"
            style={{
              display: "flex",
              minHeight: "2.75rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.75rem",
              border: "1px solid #e4d7c8",
              background: "#fff",
              color: "#2f2013",
              fontSize: "1rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to start
          </a>
        </div>

        {/* The one thing worth reading out over the phone. */}
        {error.digest ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              fontVariantNumeric: "tabular-nums",
              color: "#9a8c7e",
            }}
          >
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
