"use client";

import { useEffect, useRef } from "react";

/**
 * Android's Back button, pointed at the sheet in front of the cashier.
 *
 * The app is a WebView, and its Back button calls goBack() on the web view
 * whenever there is any history to go back through. So with the Current Order
 * sheet open, Back did not close the sheet — it left the page the sheet was
 * on, usually landing somewhere the cashier did not ask for with the order
 * still sitting behind it. The only way out of a sheet was to find its small
 * Close button.
 *
 * The fix is to give Back something of ours to go back to: opening an overlay
 * pushes a history entry at the same URL, and the pop that follows closes the
 * overlay instead of moving the app.
 *
 * ---
 *
 * One entry, not one per overlay.
 *
 * The obvious version — every overlay pushes its own entry and pops it on the
 * way out — spends the sequence this till runs all day churning history for
 * no reason: placing an order closes the cart and opens the printed-bill
 * dialog in the same React commit, so an entry would come off and another go
 * straight back on, with a queued traversal crossing a push in the middle of
 * it. Nothing about that ordering is guaranteed, and it is not worth relying
 * on when the same behaviour comes out of not touching history at all.
 *
 * So there is exactly one entry outstanding while anything is open, and a
 * stack of who is open kept here. Back pops that entry and closes whoever is
 * on top; if anything is still open underneath, a new entry is pushed and the
 * next Back closes that one. Opening and closing inside one commit nets to
 * nothing, because reconciling is deferred to a microtask and by then the
 * stack says what it should have said all along.
 */

/**
 * Marks the entries this module pushes.
 *
 * For reading in a debugger only, never for deciding anything: Next's router
 * calls replaceState with its own object whenever it refreshes a route, which
 * a server action does on its way back. The marker on the entry we pushed is
 * gone by the time the order is placed, while the entry itself is still there.
 * What we pushed is tracked here instead.
 */
const MARK = "nc_overlay";

interface Overlay {
  close: () => void;
}

let stack: Overlay[] = [];
/** Whether one of our entries is currently on the history stack. */
let armed = false;
/** Where we were when we pushed it, to tell an unwind from a navigation. */
let armedAt = "";
/** A traversal we asked for ourselves, which must not close anything. */
let unwinding = false;
let scheduled = false;
let listening = false;

function reconcile() {
  scheduled = false;

  // A traversal we asked for is still in flight. Pushing now would put an
  // entry directly on top of the one that traversal is about to leave, and it
  // would be discarded again as soon as it landed. Wait: onPop runs this
  // again the moment it does.
  if (unwinding) return;

  if (stack.length > 0 && !armed) {
    window.history.pushState({ [MARK]: true }, "");
    armed = true;
    armedAt = window.location.href;
    return;
  }

  if (stack.length === 0 && armed) {
    armed = false;
    // Not if the router has moved in the meantime — a tap on a link in an
    // open drawer both closes it and navigates. Going back there would undo
    // the navigation rather than the overlay. The URL is the tell, since the
    // entry we pushed sits at the one we were on.
    if (window.location.href !== armedAt) return;
    unwinding = true;
    window.history.back();
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  // After React has finished the commit, so a close and an open in the same
  // render cancel each other out instead of racing.
  queueMicrotask(reconcile);
}

function onPop() {
  if (unwinding) {
    unwinding = false;
    // Whatever opened while that was in flight still needs an entry.
    schedule();
    return;
  }
  if (!armed) return; // Somebody else's entry; not ours to act on.

  armed = false;
  // Only the topmost: Back is one step, and the sheet under a confirmation
  // should still be there when the confirmation goes.
  const top = stack[stack.length - 1];
  top?.close();

  // Re-arm from whatever the stack says once React has caught up. Usually
  // that is the overlay underneath the one just closed; if close() decided to
  // refuse — a confirmation mid-request will not go — it is the same one
  // again, and Back stays pointed at it rather than at the way out of the app.
  schedule();
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", onPop);
}

/**
 * Closes `open` on Back, for as long as it is open.
 *
 * `close` may be a fresh function every render; it is read through a ref so
 * that alone never pushes or pops anything.
 */
export function useOverlayBack(open: boolean, close: () => void) {
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!open) return;
    return registerOverlay(() => closeRef.current());
  }, [open]);
}

/**
 * The hook without React, for the tests.
 *
 * Every hard part of this is in the order things happen — a close and an open
 * in one commit, an unwind still in flight when the next overlay opens — and
 * none of it needs a component to exercise.
 */
export function registerOverlay(close: () => void): () => void {
  const overlay: Overlay = { close };
  stack.push(overlay);
  listen();
  schedule();

  return () => {
    stack = stack.filter((entry) => entry !== overlay);
    schedule();
  };
}

/** Drops every trace of the module, so one test cannot colour the next. */
export function resetOverlayBackForTests() {
  stack = [];
  armed = false;
  armedAt = "";
  unwinding = false;
  scheduled = false;
  listening = false;
}
