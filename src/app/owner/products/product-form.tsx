"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import { ErrorNote } from "@/components/ui/states";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { createProduct, updateProduct } from "./actions";

export interface ProductFormValues {
  id: string;
  name: string;
  category_id: string | null;
  price: string;
  image_url: string | null;
  is_active: boolean;
}

export function ProductForm({
  categories,
  product,
}: {
  categories: ReadonlyArray<{ id: string; name: string }>;
  product?: ProductFormValues;
}) {
  const editing = Boolean(product);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    editing ? updateProduct : createProduct,
    EMPTY_FORM_STATE,
  );

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-5">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        <Field
          label="Food name"
          name="name"
          defaultValue={product?.name ?? ""}
          required
          maxLength={80}
          placeholder="Chicken Roll"
          autoFocus={!editing}
        />

        <SelectField
          label="Category"
          name="category_id"
          defaultValue={product?.category_id ?? ""}
          placeholder="No category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />

        <Field
          label="Price"
          name="price"
          defaultValue={product?.price ?? ""}
          required
          // Numeric keypad on the counter tablet; decimals allowed but rarely used.
          inputMode="decimal"
          placeholder="120"
          hint="In rupees. 120 or 120.50 — no ₹ sign needed."
        />

        <div className="space-y-1.5">
          <label htmlFor="image" className="block text-sm font-medium text-ink-700">
            Photo <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            className="w-full rounded-control border border-cream-300 bg-cream-50 px-4 py-3 text-base text-ink-700 file:mr-3 file:rounded-control file:border-0 file:bg-bean-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-bean-800"
          />
          <p className="text-sm text-ink-500">JPG or PNG, under 2 MB.</p>
        </div>

        {product?.image_url ? (
          <div className="flex items-center gap-4 rounded-control border border-cream-300 bg-cream-100 p-3">
            {/* Plain <img>: the URL is user-supplied Supabase Storage, and
                next/image would need the host allow-listed for no real gain
                on a thumbnail this size. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url}
              alt=""
              className="h-16 w-16 rounded-control object-cover"
            />
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="remove_image" className="size-4" />
              Remove this photo
            </label>
          </div>
        ) : null}

        <label className="flex items-center gap-3 rounded-control border border-cream-300 bg-cream-100 px-4 py-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={product?.is_active ?? true}
            className="size-5"
          />
          <span>
            <span className="block font-medium text-ink-900">Active</span>
            <span className="block text-sm text-ink-500">
              Inactive items stay in sales history but disappear from the till.
            </span>
          </span>
        </label>

        {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" size="lg" pending={pending} pendingLabel="Saving…">
            {editing ? "Save changes" : "Save item"}
          </Button>
          <Link
            href="/owner/products"
            className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-ink-700 hover:bg-cream-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  );
}
