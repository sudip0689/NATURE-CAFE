"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import { printReceipt, type ReceiptData } from "@/lib/printing";

/**
 * Calls the printer abstraction rather than window.print() directly, so that
 * registering a Bluetooth or USB driver later changes nothing here.
 */
export function PrintButton({ receipt }: { receipt: ReceiptData }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    setProblem(null);
    setPrinting(true);
    const outcome = await printReceipt(receipt);
    setPrinting(false);
    if (!outcome.ok) setProblem(outcome.message);
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        fullWidth
        onClick={handlePrint}
        pending={printing}
        pendingLabel="Opening print…"
      >
        Print receipt
      </Button>
      {problem ? <ErrorNote>{problem}</ErrorNote> : null}
    </div>
  );
}
