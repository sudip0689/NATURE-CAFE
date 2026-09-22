import { createClient } from "@/lib/supabase/server";
import { ErrorNote } from "@/components/ui/states";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · Nature Caffe" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          Settings
        </h1>
        <p className="mt-1 text-ink-500">
          Café identity, UPI, and what prints on the receipt.
        </p>
      </header>

      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <ErrorNote>
          The settings row is missing. Re-run migration 0001 — it seeds exactly one.
        </ErrorNote>
      )}
    </div>
  );
}
