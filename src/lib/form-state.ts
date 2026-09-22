/**
 * Shared shape for `useActionState` forms.
 *
 * This lives outside every `"use server"` file on purpose. A module marked
 * `"use server"` may export *only* async functions — Next.js turns each export
 * into a callable server endpoint, and a plain object has no meaning as one.
 * Exporting a constant from an actions file throws at module evaluation:
 *
 *   A "use server" file can only export async functions, found object.
 *
 * Interfaces are fine there (they erase at compile time); values are not.
 */

export interface FormState {
  error: string | null;
  success: string | null;
}

export const EMPTY_FORM_STATE: FormState = { error: null, success: null };
