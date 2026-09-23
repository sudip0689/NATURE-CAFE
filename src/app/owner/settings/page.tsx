import { getSettings } from "@/lib/settings";
import { ErrorNote } from "@/components/ui/states";
import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/shell/page";

export const metadata = { title: "Settings · Nature Caffe" };

export default async function SettingsPage() {
  // Same row the layout's header already fetched this request.
  const settings = await getSettings();

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
