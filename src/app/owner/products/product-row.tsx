"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, ErrorNote } from "@/components/ui/states";
import { formatMoneyCompact } from "@/lib/money";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { productRowAction } from "./actions";

export interface ProductRowData {
  id: string;
  name: string;
  price: string;
  image_url: string | null;
  is_active: boolean;
  categoryName: string | null;
}

export function ProductRow({ product }: { product: ProductRowData }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    productRowAction,
    EMPTY_FORM_STATE,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt=""
              className="size-14 shrink-0 rounded-control object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-control bg-bean-100 font-display text-lg font-semibold text-bean-500"
            >
              {product.name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-[8rem] flex-1">
            <p className="font-medium text-ink-900">{product.name}</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-ink-500">
              {product.categoryName ?? "No category"}
              {product.is_active ? null : <Badge tone="muted">Hidden</Badge>}
            </p>
          </div>

          <p className="tabular text-lg font-semibold text-ink-900">
            {formatMoneyCompact(product.price)}
          </p>

          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={product.id} />

            <Link
              href={`/owner/products/${product.id}/edit`}
              className="inline-flex min-h-touch items-center rounded-control border border-cream-300 bg-cream-50 px-4 text-base font-medium text-ink-900 hover:bg-cream-100"
            >
              Edit
            </Link>

            <Button type="submit" name="intent" value="toggle" variant="ghost" pending={pending}>
              {product.is_active ? "Hide" : "Show"}
            </Button>
            <input
              type="hidden"
              name="is_active"
              value={product.is_active ? "false" : "true"}
            />

            {confirmingDelete ? (
              <>
                <Button type="submit" name="intent" value="delete" variant="danger">
                  Really delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
            )}
          </form>
        </div>

        {state.error ? (
          <div className="mt-3">
            <ErrorNote>{state.error}</ErrorNote>
          </div>
        ) : null}
      </Card>
    </li>
  );
}
