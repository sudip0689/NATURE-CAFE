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
    // overflow-x-clip, not hidden: the decorations bleed past the edges on a
    // narrow phone and must not create a sideways scroll.
    <main className="relative min-h-dvh overflow-x-clip bg-ivory text-brandink">
      <LeafSpray className="pointer-events-none absolute -left-12 -top-10 w-56 sm:w-72" />

      {/* max-w keeps this a phone-shaped card on a desktop counter screen
          rather than stretching two cards across 1280px. */}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[27rem] flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <p className="font-hand pointer-events-none absolute right-3 top-8 text-right text-[1.4rem] leading-[1.15] text-caramel sm:text-2xl">
          Good
          <br />
          Food
          <br />
          Good
          <br />
          Mood
          <br />
          <span aria-hidden="true">♡</span>
        </p>

        <header className="flex flex-col items-center text-center">
          <NatureCaffeMark className="w-[4.25rem] sm:w-20" />

          <h1 className="mt-2 text-[clamp(1.95rem,9vw,2.5rem)] font-bold leading-none tracking-[-0.02em]">
            <span className="text-forest">Nature</span>{" "}
            <span className="text-caramel">Caffe</span>
          </h1>

          <p className="mt-2 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-brandmuted">
            Good Food · Good Mood
          </p>

          {/* hairline · leaf · hairline */}
          <div aria-hidden="true" className="mt-2.5 flex w-44 items-center gap-2">
            <span className="h-px flex-1 bg-brandline" />
            <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="#1F8A4C">
              <path d="M14 2C7 2 2 5.5 2 11c0 1.4.4 2.4.4 2.4S6 8.5 13 6c0 0-5.4 3.2-8.6 8.6C7 15 14 13.6 14 2Z" />
            </svg>
            <span className="h-px flex-1 bg-brandline" />
          </div>

          <p className="font-script mt-2 text-[clamp(2.3rem,11vw,3rem)] leading-[1.05] text-caramel">
            Welcome!
          </p>
          <p className="mt-0.5 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-brandmuted">
            Choose your access
          </p>
        </header>

        <div className="mt-5 space-y-4">
          <AccessCard
            action={enterManagement}
            tone="green"
            icon={<CrownIcon className="size-7 text-forest" />}
            title="Café Management"
            description="Manage menu, prices, sales, settings and more"
            cta="Enter Management"
          />

          <AccessCard
            action={openBilling}
            tone="brown"
            icon={<RegisterIcon className="size-7 text-coffee" />}
            title="Billing Counter"
            description="Start billing, serve customers, make them smile"
            cta="Open Billing"
          />
        </div>

        <ul className="mt-5 flex items-stretch justify-center text-center">
          <Feature icon={<CutleryIcon className="size-5" />} label="Tasty Food" />
          <Feature icon={<PeopleIcon className="size-5" />} label="Happy Customers" divider />
          <Feature icon={<HeartIcon className="size-5" />} label="Better Days" divider />
        </ul>

        {/* mt-auto pushes this band to the foot of a tall screen; the fixed
            height means the scene, the script note and the address never
            collide on a short one, which is what they did when this was three
            absolutely-positioned siblings sharing whatever space was left. */}
        <div className="relative mt-auto h-36 shrink-0">
          <CoffeeScene className="pointer-events-none absolute inset-x-[-1.25rem] bottom-0 h-32 w-[calc(100%+2.5rem)]" />

          <p className="font-hand pointer-events-none absolute right-1 top-0 text-right text-[1.15rem] leading-[1.2] text-caramel">
            Serve
            <br />
            Goodness
            <br />
            Everyday
            <br />
            <span aria-hidden="true">♡</span>
          </p>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-brandline bg-white/85 px-3.5 py-1.5 text-xs text-brandmuted backdrop-blur-sm">
              <PinIcon className="size-3.5 text-caramel" />
              Amta, Howrah, West Bengal
            </p>
            <p className="text-[0.7rem] text-brandmuted">
              Nature Caffe POS&nbsp;&nbsp;{APP_VERSION}
            </p>
          </div>
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
          "group block w-full overflow-hidden rounded-3xl border text-left",
          "shadow-[0_2px_10px_rgba(90,46,18,0.07)] transition-shadow duration-200",
          "hover:shadow-[0_6px_18px_rgba(90,46,18,0.12)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          green
            ? "border-leaf/25 bg-mint focus-visible:outline-forest"
            : "border-caramel/25 bg-sand focus-visible:outline-coffee",
        ].join(" ")}
      >
        <span className="flex items-center gap-3.5 px-4 py-4">
          <span
            className={[
              "flex size-[3.5rem] shrink-0 items-center justify-center rounded-full",
              green ? "bg-leaf/15" : "bg-caramel/15",
            ].join(" ")}
          >
            {icon}
          </span>

          <span className="min-w-0 flex-1">
            {/* text-balance keeps the title on one line at 360px and splits
                the description evenly instead of leaving an orphan word. */}
            <span
              className={[
                "block text-[1.08rem] font-bold leading-tight tracking-[-0.01em]",
                green ? "text-forest" : "text-coffee",
              ].join(" ")}
            >
              {title}
            </span>
            <span className="mt-1 block text-balance text-[0.8rem] leading-snug text-brandmuted">
              {description}
            </span>
          </span>

          <ChevronRight
            className={[
              "size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
              green ? "text-forest/60" : "text-coffee/60",
            ].join(" ")}
          />
        </span>

        {/* min-h 3rem = 48px, comfortably past the 44px touch minimum */}
        <span
          className={[
            "flex min-h-[3rem] items-center justify-between px-5 text-white",
            green ? "bg-forest" : "bg-coffee",
          ].join(" ")}
        >
          <span className="text-[1.02rem] font-semibold">{cta}</span>
          <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
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
        "flex flex-1 flex-col items-center gap-1.5 px-1 text-caramel",
        divider ? "border-l border-brandline" : "",
      ].join(" ")}
    >
      {icon}
      <span className="text-[0.76rem] leading-tight text-brandmuted">{label}</span>
    </li>
  );
}
