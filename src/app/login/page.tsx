import { redirect } from "next/navigation";

import { getSessionUser, homeRouteFor } from "@/lib/auth";
import { enterManagement, openBilling } from "./actions";
import {
  ArrowRight,
  ChevronRight,
  CoffeeScene,
  CrownIcon,
  CutleryIcon,
  HeartIcon,
  LeafSpray,
  NatureCaffeMark,
  PeopleIcon,
  PinIcon,
  RegisterIcon,
} from "./welcome-art";

export const metadata = {
  title: "Welcome · Nature Caffe",
};

const APP_VERSION = "v1.0.0";

export default async function WelcomePage() {
  // Someone already signed in has no business on this screen.
  const user = await getSessionUser();
  if (user) redirect(homeRouteFor(user.profile.role));

  return (
    /*
     * One screen, never scrolls.
     *
     * h-dvh pins the page to the *visible* viewport — dvh, not vh, because on
     * Android the URL bar eats ~100px and vh ignores it, which is what pushed
     * the Billing card below the fold.
     *
     * The column below is ordered by priority: everything the brief calls
     * essential is flex-none and therefore cannot be squeezed, while the
     * decorative café band is the only flexible row. On a short screen that
     * band collapses toward nothing and the cards stay whole; on a tall one it
     * expands to fill. Nothing that matters is ever clipped.
     */
    <main className="relative flex h-dvh flex-col overflow-hidden bg-ivory text-brandink">
      <LeafSpray className="pointer-events-none absolute -left-12 -top-12 w-44 sm:w-56" />

      <div className="relative mx-auto flex h-full w-full max-w-[26rem] flex-col px-5 pb-[env(safe-area-inset-bottom)] pt-3">
        <p className="font-hand pointer-events-none absolute right-3 top-3 text-right text-[1.05rem] leading-[1.15] text-caramel">
          Good
          <br />
          Food
          <br />
          Good
          <br />
          Mood
        </p>

        <header className="flex flex-none flex-col items-center text-center">
          <NatureCaffeMark className="w-[3.25rem]" />

          <h1 className="mt-1.5 text-[clamp(1.7rem,8vw,2.1rem)] font-bold leading-none tracking-[-0.02em]">
            <span className="text-forest">Nature</span>{" "}
            <span className="text-caramel">Caffe</span>
          </h1>

          <p className="mt-1.5 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-brandmuted">
            Good Food · Good Mood
          </p>

          <div aria-hidden="true" className="mt-2 flex w-36 items-center gap-2">
            <span className="h-px flex-1 bg-brandline" />
            <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="#1F8A4C">
              <path d="M14 2C7 2 2 5.5 2 11c0 1.4.4 2.4.4 2.4S6 8.5 13 6c0 0-5.4 3.2-8.6 8.6C7 15 14 13.6 14 2Z" />
            </svg>
            <span className="h-px flex-1 bg-brandline" />
          </div>

          <p className="font-script mt-1.5 text-[clamp(1.9rem,9.5vw,2.5rem)] leading-[1.05] text-caramel">
            Welcome!
          </p>
          <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-brandmuted">
            Choose your access
          </p>
        </header>

        <div className="mt-3 flex-none space-y-3">
          <AccessCard
            action={enterManagement}
            tone="green"
            icon={<CrownIcon className="size-6 text-forest" />}
            title="Café Management"
            description="Manage menu, prices, sales & settings"
            cta="Enter Management"
          />

          <AccessCard
            action={openBilling}
            tone="brown"
            icon={<RegisterIcon className="size-6 text-coffee" />}
            title="Billing Counter"
            description="Start billing & serve customers"
            cta="Open Billing"
          />
        </div>

        <ul className="mt-3 flex flex-none items-stretch justify-center text-center">
          <Feature icon={<CutleryIcon className="size-4" />} label="Tasty Food" />
          <Feature icon={<PeopleIcon className="size-4" />} label="Happy Customers" divider />
          <Feature icon={<HeartIcon className="size-4" />} label="Better Days" divider />
        </ul>

        {/* The only flexible row: decoration that yields its space first. */}
        <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
          {/* Bottom-anchored at a fixed height rather than h-full: the scene
              uses preserveAspectRatio="slice", so stretching it to fill a tall
              flexible row zooms and distorts the cup. max-h-full lets it crop
              from the top when the row is shorter than 8rem. */}
          <CoffeeScene className="pointer-events-none absolute inset-x-[-1.25rem] bottom-0 h-32 max-h-full w-[calc(100%+2.5rem)]" />
          <p className="font-hand pointer-events-none absolute right-0 top-0 text-right text-[0.95rem] leading-[1.15] text-caramel">
            Serve
            <br />
            Goodness
            <br />
            Everyday
          </p>
        </div>

        <div className="flex flex-none flex-col items-center gap-1 pb-1 pt-1.5">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brandline bg-white/85 px-3 py-1 text-[0.68rem] text-brandmuted backdrop-blur-sm">
            <PinIcon className="size-3 text-caramel" />
            Amta, Howrah, West Bengal
          </p>
          <p className="text-[0.62rem] text-brandmuted">
            Nature Caffe POS&nbsp;&nbsp;{APP_VERSION}
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * One access route. The whole card is the submit button — at a counter you aim
 * for the big coloured thing, not for a link inside it — and the coloured bar
 * along the bottom names the action for anyone who reads before tapping.
 */
function AccessCard({
  action,
  tone,
  icon,
  title,
  description,
  cta,
}: {
  action: () => Promise<void>;
  tone: "green" | "brown";
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  const green = tone === "green";

  return (
    <form action={action}>
      <button
        type="submit"
        className={[
          "group block w-full overflow-hidden rounded-2xl border text-left",
          "shadow-[0_2px_10px_rgba(90,46,18,0.07)] transition-shadow duration-200",
          "hover:shadow-[0_6px_18px_rgba(90,46,18,0.12)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          green
            ? "border-leaf/25 bg-mint focus-visible:outline-forest"
            : "border-caramel/25 bg-sand focus-visible:outline-coffee",
        ].join(" ")}
      >
        <span className="flex items-center gap-3 px-3.5 py-3">
          <span
            className={[
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              green ? "bg-leaf/15" : "bg-caramel/15",
            ].join(" ")}
          >
            {icon}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={[
                "block text-[1.02rem] font-bold leading-tight tracking-[-0.01em]",
                green ? "text-forest" : "text-coffee",
              ].join(" ")}
            >
              {title}
            </span>
            <span className="mt-0.5 block text-[0.76rem] leading-snug text-brandmuted">
              {description}
            </span>
          </span>

          <ChevronRight
            className={[
              "size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
              green ? "text-forest/60" : "text-coffee/60",
            ].join(" ")}
          />
        </span>

        {/* min-h 2.75rem = 44px, the touch-target floor. */}
        <span
          className={[
            "flex min-h-[2.75rem] items-center justify-between px-4 text-white",
            green ? "bg-forest" : "bg-coffee",
          ].join(" ")}
        >
          <span className="text-[0.95rem] font-semibold">{cta}</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </button>
    </form>
  );
}

function Feature({
  icon,
  label,
  divider = false,
}: {
  icon: React.ReactNode;
  label: string;
  divider?: boolean;
}) {
  return (
    <li
      className={[
        "flex flex-1 flex-col items-center gap-1 px-1 text-caramel",
        divider ? "border-l border-brandline" : "",
      ].join(" ")}
    >
      {icon}
      <span className="text-[0.66rem] leading-tight text-brandmuted">{label}</span>
    </li>
  );
}
