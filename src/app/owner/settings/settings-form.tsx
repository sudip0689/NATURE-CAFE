"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { ErrorNote, SuccessNote } from "@/components/ui/states";
import type { Settings } from "@/lib/supabase/types";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { updateSettings } from "./actions";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateSettings,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card className="space-y-5 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Café details
        </h2>
        <p className="-mt-3 text-sm text-ink-500">
          These print at the top of every receipt.
        </p>

        <Field label="Café name" name="cafe_name" defaultValue={settings.cafe_name} required />
        <Field label="Tagline" name="tagline" defaultValue={settings.tagline} />
        <Field
          label="Address"
          name="address"
          defaultValue={settings.address}
          placeholder="Amta, Howrah, WB"
        />
        <Field
          label="Phone"
          name="phone"
          defaultValue={settings.phone}
          inputMode="tel"
          placeholder="9876543210"
        />
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">UPI</h2>
        <p className="-mt-3 text-sm text-ink-500">
          Used to build the QR printed on receipts. A static QR shows the customer
          where to pay — it does not confirm that they did. The cashier still
          confirms payment before the bill is saved.
        </p>

        <Field
          label="UPI ID"
          name="upi_id"
          defaultValue={settings.upi_id}
          placeholder="naturecaffe@okhdfcbank"
          autoCapitalize="none"
          spellCheck={false}
          hint="Leave blank to print receipts without a QR."
        />
        <Field
          label="Merchant name"
          name="upi_name"
          defaultValue={settings.upi_name}
          placeholder="Nature Caffe"
          hint="The name the customer sees in their UPI app."
        />

        <div className="space-y-1.5">
          <label htmlFor="upi_qr" className="block text-sm font-medium text-ink-700">
            QR image{" "}
            <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <input
            id="upi_qr"
            name="upi_qr"
            type="file"
            accept="image/*"
            className="w-full rounded-control border border-cream-300 bg-cream-50 px-4 py-3 text-base text-ink-700 file:mr-3 file:rounded-control file:border-0 file:bg-bean-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-bean-800"
          />
          <p className="text-sm text-ink-500">
            Only needed if you want to print your bank&apos;s own QR instead of one
            generated from the UPI ID above.
          </p>
        </div>

        {settings.upi_qr_url ? (
          <div className="flex items-center gap-4 rounded-control border border-cream-300 bg-cream-100 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.upi_qr_url}
              alt="Current UPI QR code"
              className="size-20 rounded-control bg-white object-contain p-1"
            />
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="remove_qr" className="size-4" />
              Remove this QR image
            </label>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Receipt</h2>
        <Field
          label="Footer line"
          name="receipt_footer"
          defaultValue={settings.receipt_footer}
          placeholder="Thank You! Visit Again"
        />
      </Card>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.success ? <SuccessNote>{state.success}</SuccessNote> : null}

      <Button type="submit" size="lg" pending={pending} pendingLabel="Saving…">
        Save settings
      </Button>
    </form>
  );
}
