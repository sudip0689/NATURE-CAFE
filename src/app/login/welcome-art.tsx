/**
 * Artwork for the welcome screen.
 *
 * All inline SVG rather than image files: it stays crisp at any density, it
 * carries no extra network requests on the one screen that must open fast on
 * café wifi, and the brand colours come from the same tokens the rest of the
 * page uses instead of being baked into a PNG.
 *
 * Everything here is decorative — every piece is aria-hidden, and the meaning
 * lives in the text beside it.
 */

/** Leaf-and-cup mark: two leaves growing out from behind a coffee cup. */
export function NatureCaffeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 116" className={className} aria-hidden="true" fill="none">
      {/* steam */}
      <g stroke="#5A2E12" strokeWidth="4" strokeLinecap="round">
        <path d="M74 10c-7 7 7 11 0 19" />
        <path d="M88 4c-8 8 8 13 0 22" />
        <path d="M61 18c-5 5 5 8 0 12" />
      </g>

      {/* leaves, light behind dark */}
      <path
        d="M66 92C66 62 50 38 20 32c-6 30 14 54 46 60Z"
        fill="#1F8A4C"
      />
      <path
        d="M68 92C70 64 62 40 44 24 30 46 38 74 68 92Z"
        fill="#0E5A35"
      />

      {/* cup */}
      <path
        d="M62 44h46v22a23 23 0 0 1-23 23 23 23 0 0 1-23-23V44Z"
        stroke="#5A2E12"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M108 52h8a11 11 0 0 1 0 22h-8"
        stroke="#5A2E12"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M3 8.5a1.5 1.5 0 1 1 2.2 1.33l1.6 3.02L10.6 6.9a1.5 1.5 0 1 1 2.8 0l3.8 5.95 1.6-3.02A1.5 1.5 0 1 1 21 8.5c0 .6-.35 1.12-.86 1.36L18.7 17H5.3L3.86 9.86A1.5 1.5 0 0 1 3 8.5Z" />
      <rect x="5" y="18.4" width="14" height="2.6" rx="1.3" />
    </svg>
  );
}

/** Counter till: a drawer with a receipt sheet on top. */
export function RegisterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <rect x="3.2" y="4" width="17.6" height="8.2" rx="2" />
      <rect x="6.4" y="6.4" width="7.6" height="1.7" rx="0.85" fill="#F3E8D8" />
      <rect x="6.4" y="9.1" width="5" height="1.4" rx="0.7" fill="#F3E8D8" />
      <path d="M2.4 14h19.2a1.6 1.6 0 0 1 1.6 1.72l-.36 3.9A1.6 1.6 0 0 1 21.25 21H2.75a1.6 1.6 0 0 1-1.59-1.38l-.36-3.9A1.6 1.6 0 0 1 2.4 14Z" />
      <rect x="9.6" y="16.6" width="4.8" height="1.8" rx="0.9" fill="#F3E8D8" />
    </svg>
  );
}

export function CutleryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3v7a2.5 2.5 0 0 1-5 0V3M4.5 3v7M4.5 12.5V21" />
      <path d="M17 3c-2 1.4-3 3.6-3 6s1 3.6 3 3.6V21" />
    </svg>
  );
}

export function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
      <path d="M16.4 5.2a3.2 3.2 0 0 1 0 6.1M17.6 14.8c2.2.6 3.6 2.5 3.6 5.2" />
    </svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.4S3.6 15.6 3.6 9.7A4.7 4.7 0 0 1 12 6.9a4.7 4.7 0 0 1 8.4 2.8c0 5.9-8.4 10.7-8.4 10.7Z" />
    </svg>
  );
}

export function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2.4a7.1 7.1 0 0 0-7.1 7.1c0 5.2 6.3 11.4 6.6 11.7a.7.7 0 0 0 1 0c.3-.3 6.6-6.5 6.6-11.7A7.1 7.1 0 0 0 12 2.4Zm0 9.8a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z" />
    </svg>
  );
}

/** Botanical spray for the top-left corner. Sits behind everything. */
export function LeafSpray({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" className={className} aria-hidden="true" fill="none">
      <g stroke="#1F8A4C" strokeWidth="2.4" strokeLinecap="round" opacity="0.5">
        <path d="M6 4c30 26 58 60 78 100" />
        <path d="M18 40c22 2 40 14 50 30" />
        <path d="M44 84c20 0 34 10 42 24" />
      </g>
      <g fill="#1F8A4C" opacity="0.42">
        <ellipse cx="34" cy="26" rx="19" ry="11" transform="rotate(28 34 26)" />
        <ellipse cx="72" cy="62" rx="21" ry="12" transform="rotate(34 72 62)" />
        <ellipse cx="104" cy="106" rx="18" ry="10" transform="rotate(40 104 106)" />
        <ellipse cx="12" cy="62" rx="16" ry="9" transform="rotate(-24 12 62)" />
        <ellipse cx="48" cy="108" rx="15" ry="9" transform="rotate(-18 48 108)" />
      </g>
    </svg>
  );
}

/**
 * The warm café note at the foot of the page: a wooden surface with a latte
 * and a few beans. Kept low-contrast so it reads as atmosphere, never as
 * something to tap.
 */
export function CoffeeScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 150" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B87532" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#8A4F22" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#5A2E12" stopOpacity="0.40" />
        </linearGradient>
      </defs>

      <path d="M0 74h400v76H0z" fill="url(#wood)" />
      <g stroke="#5A2E12" strokeOpacity="0.16" strokeWidth="1.4">
        <path d="M0 96h400M0 118h400M0 138h400" />
      </g>

      {/* latte, left */}
      <g transform="translate(34 40)">
        <ellipse cx="42" cy="78" rx="46" ry="9" fill="#5A2E12" opacity="0.18" />
        <path d="M6 30h72v26a36 36 0 0 1-72 0V30Z" fill="#0E5A35" opacity="0.85" />
        <path d="M78 36h9a13 13 0 0 1 0 26h-9" fill="none" stroke="#0E5A35" strokeOpacity="0.85" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="42" cy="30" rx="36" ry="10" fill="#F3E8D8" />
        <ellipse cx="42" cy="30" rx="20" ry="5.6" fill="#E3C9A6" />
      </g>

      {/* beans, right */}
      <g fill="#5A2E12" opacity="0.5">
        <g transform="translate(300 108) rotate(24)">
          <ellipse rx="11" ry="7.4" />
          <path d="M-11 0c5-4 17-4 22 0" fill="none" stroke="#F3E8D8" strokeWidth="1.6" strokeOpacity="0.7" />
        </g>
        <g transform="translate(330 124) rotate(-16)">
          <ellipse rx="10" ry="6.8" />
          <path d="M-10 0c4.5-3.6 15.5-3.6 20 0" fill="none" stroke="#F3E8D8" strokeWidth="1.6" strokeOpacity="0.7" />
        </g>
        <g transform="translate(356 104) rotate(40)">
          <ellipse rx="9" ry="6" />
          <path d="M-9 0c4-3.2 14-3.2 18 0" fill="none" stroke="#F3E8D8" strokeWidth="1.5" strokeOpacity="0.7" />
        </g>
      </g>
    </svg>
  );
}
