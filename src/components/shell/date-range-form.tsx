/**
 * The date filter shared by Sales, Bills and Reports.
 *
 * A plain GET form — filtering survives a reload, is linkable, and needs no
 * JavaScript. Two dates and a button sit on one row from 420px; below that
 * they stack, because three controls across 360px leaves each one too narrow
 * to read the date inside it.
 */
export function DateRangeForm({
  from,
  to,
  max,
  children,
}: {
  from: string;
  to: string;
  /** Usually today — stops anyone filtering into the future. */
  max?: string;
  /** Extra controls, e.g. a search box, rendered before the dates. */
  children?: React.ReactNode;
}) {
  return (
    <form className="mb-4 flex flex-wrap items-end gap-2">
      {children}

      <div className="flex min-w-0 flex-1 gap-2 min-[420px]:flex-initial">
        <Field label="From" name="from" value={from} max={max} />
        <Field label="To" name="to" value={to} max={max} />
      </div>

      <button
        type="submit"
        className="h-11 shrink-0 rounded-full bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-leaf"
      >
        Show
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  max,
}: {
  label: string;
  name: string;
  value: string;
  max?: string;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-meta font-medium text-brandmuted">{label}</span>
      <input
        name={name}
        type="date"
        defaultValue={value}
        max={max}
        className="h-11 w-full min-w-0 rounded-xl border border-brandline bg-white px-2.5 text-[0.82rem] text-brandink focus:border-leaf focus:outline-none"
      />
    </label>
  );
}
