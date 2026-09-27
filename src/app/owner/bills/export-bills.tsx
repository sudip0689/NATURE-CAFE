"use client";

/**
 * Export to Excel.
 *
 * Plain links, not fetch-and-Blob. The file is built by the route handler and
 * served with Content-Disposition, which is the one shape both a desktop
 * browser and an Android WebView already know how to save — a Blob assembled
 * in the page has nowhere to go on the phone.
 *
 * "Export Excel" takes whatever the café is currently looking at; "Export All"
 * drops the filters. Both leave out deleted bills, because the route reads
 * live bills like everything else does.
 */
export function ExportBills({
  q,
  from,
  to,
  filtering,
}: {
  q: string;
  from: string;
  to: string;
  filtering: boolean;
}) {
  const filtered = new URLSearchParams();
  if (q) filtered.set("q", q);
  if (from) filtered.set("from", from);
  if (to) filtered.set("to", to);

  const query = filtered.toString();

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <a
        href={`/owner/bills/export${query ? `?${query}` : ""}`}
        // The WebView needs a real navigation to hand to Android's downloader;
        // download= alone does nothing there.
        download
        className="inline-flex min-h-touch items-center gap-2 rounded-control bg-forest px-4 text-base font-medium text-white transition-colors hover:bg-leaf"
      >
        <SheetIcon className="size-4" />
        Export Excel
      </a>

      {filtering ? (
        <a
          href="/owner/bills/export?all=1"
          download
          className="inline-flex min-h-touch items-center gap-2 rounded-control border border-brandline bg-white px-4 text-base font-medium text-brandink transition-colors hover:bg-ivory"
        >
          Export All
        </a>
      ) : null}
    </div>
  );
}

function SheetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4M8 13h8M8 17h8M8 13v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
