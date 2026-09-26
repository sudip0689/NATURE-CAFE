"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon, PrinterIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import {
  canOpenPrinterSettings,
  openPrinterSettings,
  printReceipt,
  type PrintStage,
  type ReceiptData,
} from "@/lib/printing";

/**
 * What the button is doing, from the counter's point of view.
 *
 * "working" carries the driver's own stage rather than a guess: connecting to
 * a printer that is switched off takes several seconds before it fails, and a
 * button that sits there unchanged for that long reads as a dead button and
 * gets tapped again.
 */
type State =
  | { kind: "idle" }
  | { kind: "working"; stage: PrintStage }
  | { kind: "success" }
  | { kind: "disconnected"; message: string }
  | { kind: "failed"; message: string };

const WORKING_LABEL: Record<PrintStage, string> = {
  preparing: "Preparing Receipt…",
  connecting: "Connecting to EZO PRINTER…",
  printing: "Printing…",
};

/** Long enough to read, short enough not to hold up the next customer. */
const SUCCESS_MS = 2200;

/**
 * Calls the printer abstraction rather than window.print() directly, so that
 * registering a Bluetooth or USB driver later changes nothing here.
 */
export function PrintButton({ receipt }: { receipt: ReceiptData }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  /**
   * The real double-tap guard. `disabled` on the button covers the common
   * case, but state updates are asynchronous and a fast double tap at a busy
   * counter can land two clicks before React has re-rendered — which on a
   * thermal printer means two receipts and a confused customer.
   */
  const inFlight = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Back to normal after the tick, unless another print has started since.
  useEffect(() => {
    if (state.kind !== "success") return;
    const timer = setTimeout(() => {
      if (alive.current) setState({ kind: "idle" });
    }, SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [state.kind]);

  const handlePrint = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ kind: "working", stage: "preparing" });

    try {
      const outcome = await printReceipt(receipt, (stage) => {
        if (alive.current) setState({ kind: "working", stage });
      });
      if (!alive.current) return;

      // Only now. Anything less than a printer that said it was done is not a
      // printed receipt, however green the button would look.
      if (outcome.ok) {
        setState({ kind: "success" });
      } else {
        setState(
          outcome.reason === "disconnected"
            ? { kind: "disconnected", message: outcome.message }
            : { kind: "failed", message: outcome.message },
        );
      }
    } finally {
      inFlight.current = false;
    }
  }, [receipt]);

  const working = state.kind === "working";

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        fullWidth
        variant={state.kind === "success" ? "paid" : "primary"}
        onClick={handlePrint}
        disabled={working || state.kind === "success"}
        pending={working}
        pendingLabel={working ? WORKING_LABEL[state.stage] : undefined}
      >
        {state.kind === "success" ? (
          <>
            <CheckIcon className="h-5 w-5" />
            Printed Successfully
          </>
        ) : (
          <>
            <PrinterIcon className="h-5 w-5" />
            Print Bill
          </>
        )}
      </Button>

      {state.kind === "disconnected" || state.kind === "failed" ? (
        <div className="space-y-2">
          <ErrorNote>
            <span className="font-semibold">
              {state.kind === "disconnected" ? "Printer Not Connected" : "Printing Failed"}
            </span>
            <br />
            {state.message}
          </ErrorNote>
          {state.kind === "disconnected" && canOpenPrinterSettings() ? (
            <Button variant="secondary" fullWidth onClick={openPrinterSettings}>
              Connect Printer
            </Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={handlePrint}>
              Try Again
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
