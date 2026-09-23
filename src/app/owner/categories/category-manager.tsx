"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, ErrorNote, SuccessNote } from "@/components/ui/states";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { categoryRowAction, createCategory } from "./actions";

export interface CategoryRowData {
  id: string;
  name: string;
  is_active: boolean;
  itemCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryRowData[] }) {
  const [state, formAction, pending] = useActionState(createCategory, EMPTY_FORM_STATE);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-brandink">
              New category
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={40}
              placeholder="Desserts"
              className="w-full min-h-touch rounded-control border border-brandline bg-white px-4 text-base text-brandink placeholder:text-brandmuted focus:border-leaf focus:outline-none"
            />
          </div>
          <Button type="submit" pending={pending} pendingLabel="Adding…">
            Add category
          </Button>
        </form>

        {state.error ? (
          <div className="mt-3">
            <ErrorNote>{state.error}</ErrorNote>
          </div>
        ) : null}
        {state.success ? (
          <div className="mt-3">
            <SuccessNote>{state.success}</SuccessNote>
          </div>
        ) : null}
      </Card>

      <ul className="space-y-3">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryRowData }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    categoryRowAction,
    EMPTY_FORM_STATE,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li>
      <Card className="p-4">
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={category.id} />

          <input
            name="name"
            defaultValue={category.name}
            maxLength={40}
            aria-label={`Name of ${category.name}`}
            className="min-w-[10rem] flex-1 min-h-touch rounded-control border border-transparent bg-transparent px-3 text-base font-medium text-brandink hover:border-brandline focus:border-leaf focus:bg-white focus:outline-none"
          />

          <span className="text-sm text-brandmuted">
            {category.itemCount === 1 ? "1 item" : `${category.itemCount} items`}
          </span>

          {category.is_active ? null : <Badge tone="muted">Hidden</Badge>}

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              name="intent"
              value="rename"
              variant="secondary"
              pending={pending}
              pendingLabel="Saving…"
            >
              Save
            </Button>

            <Button type="submit" name="intent" value="toggle" variant="ghost">
              {category.is_active ? "Hide" : "Show"}
            </Button>
            <input
              type="hidden"
              name="is_active"
              value={category.is_active ? "false" : "true"}
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
          </div>
        </form>

        {state.error ? (
          <div className="mt-3">
            <ErrorNote>{state.error}</ErrorNote>
          </div>
        ) : null}
      </Card>
    </li>
  );
}
