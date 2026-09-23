import { createClient } from "@/lib/supabase/server";
import { ErrorNote } from "@/components/ui/states";
import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/shell/page";

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
      <PageHeader
        title="Settings"
        description="Café identity, UPI, and what prints on the receipt."
      />

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
