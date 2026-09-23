/**
 * Icons for the management surface.
 *
 * Inline SVG on a 24px grid, drawn to the same weight as the welcome screen's
 * set so the two halves of the app look like one product. Everything here is
 * decorative — each is aria-hidden and sits beside a text label that carries
 * the meaning.
 */

type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Selection tick. Heavier than the rest — it reads at arm's length on a till. */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...stroke}
      strokeWidth={3}
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CutleryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M7 3v7a2.5 2.5 0 0 1-5 0V3M4.5 3v7M4.5 12.5V21" />
      <path d="M17.5 3c-2 1.4-3 3.6-3 6s1 3.6 3 3.6V21" />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M3.6 12.3V5.2a1.6 1.6 0 0 1 1.6-1.6h7.1c.42 0 .83.17 1.13.47l6.5 6.5a1.6 1.6 0 0 1 0 2.26l-7.1 7.1a1.6 1.6 0 0 1-2.26 0l-6.5-6.5a1.6 1.6 0 0 1-.47-1.13Z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M5 20V11M12 20V4M19 20v-6" />
    </svg>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M5.5 21V4.3a.8.8 0 0 1 1.2-.7l1.8 1 1.8-1a.8.8 0 0 1 .8 0l1.8 1 1.8-1a.8.8 0 0 1 .8 0l1.8 1 1.8-1a.8.8 0 0 1 1.2.7V21l-2.2-1.2-1.8 1-1.8-1-1.8 1-1.8-1-1.8 1Z" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  );
}

export function QrIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M3.5 3.5h7v7h-7zM5.7 5.7v2.6h2.6V5.7z" />
      <path d="M13.5 3.5h7v7h-7zM15.7 5.7v2.6h2.6V5.7z" />
      <path d="M3.5 13.5h7v7h-7zM5.7 15.7v2.6h2.6v-2.6z" />
      <path d="M13.5 13.5h2.6v2.6h-2.6zM17.9 13.5h2.6v2.6h-2.6zM13.5 17.9h2.6v2.6h-2.6zM17.9 17.9h2.6v2.6h-2.6z" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.3 14.5a1.5 1.5 0 0 0 .3 1.66l.05.05a1.85 1.85 0 1 1-2.62 2.62l-.05-.05a1.5 1.5 0 0 0-1.66-.3 1.5 1.5 0 0 0-.91 1.37V20a1.85 1.85 0 1 1-3.7 0v-.09a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.66.3l-.05.05A1.85 1.85 0 1 1 4.4 16.27l.05-.05a1.5 1.5 0 0 0 .3-1.66 1.5 1.5 0 0 0-1.37-.91H3a1.85 1.85 0 1 1 0-3.7h.09A1.5 1.5 0 0 0 4.46 9a1.5 1.5 0 0 0-.3-1.66l-.05-.05A1.85 1.85 0 1 1 6.73 4.67l.05.05a1.5 1.5 0 0 0 1.66.3H8.5a1.5 1.5 0 0 0 .91-1.37V3a1.85 1.85 0 1 1 3.7 0v.09a1.5 1.5 0 0 0 .91 1.37 1.5 1.5 0 0 0 1.66-.3l.05-.05a1.85 1.85 0 1 1 2.62 2.62l-.05.05a1.5 1.5 0 0 0-.3 1.66v.09a1.5 1.5 0 0 0 1.37.91H21a1.85 1.85 0 1 1 0 3.7h-.09a1.5 1.5 0 0 0-1.37.91Z" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M3.5 10.4 12 3.6l8.5 6.8V20a1 1 0 0 1-1 1h-4.6v-6H9.1v6H4.5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

export function PeopleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
      <path d="M16.4 5.2a3.2 3.2 0 0 1 0 6.1M17.6 14.8c2.2.6 3.6 2.5 3.6 5.2" />
    </svg>
  );
}

export function RupeeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M7 4h10M7 8.6h10M7 4c4.4 0 6.6 1.5 6.6 4.6S11.4 13.2 7 13.2l8 6.8" />
    </svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M7 9V3.8h10V9" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14.2h10V21H7z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M2.8 3.6h2.4l2.3 11.1a1.7 1.7 0 0 0 1.7 1.35h7.9a1.7 1.7 0 0 0 1.67-1.34l1.44-6.86H6.2" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17.2" cy="20" r="1.4" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M13.4 2 4.6 13.1a.7.7 0 0 0 .55 1.14h4.3l-1.35 7.5a.7.7 0 0 0 1.25.54l8.8-11.1a.7.7 0 0 0-.55-1.14h-4.3l1.35-7.5A.7.7 0 0 0 13.4 2Z" />
    </svg>
  );
}

export function CrownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M3 8.5a1.5 1.5 0 1 1 2.2 1.33l1.6 3.02L10.6 6.9a1.5 1.5 0 1 1 2.8 0l3.8 5.95 1.6-3.02A1.5 1.5 0 1 1 21 8.5c0 .6-.35 1.12-.86 1.36L18.7 17H5.3L3.86 9.86A1.5 1.5 0 0 1 3 8.5Z" />
      <rect x="5" y="18.4" width="14" height="2.6" rx="1.3" />
    </svg>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke} strokeWidth={2.2}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/** Small leaf used as a divider accent, matching the welcome screen. */
export function LeafAccent({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
      <path d="M14 2C7 2 2 5.5 2 11c0 1.4.4 2.4.4 2.4S6 8.5 13 6c0 0-5.4 3.2-8.6 8.6C7 15 14 13.6 14 2Z" />
    </svg>
  );
}
