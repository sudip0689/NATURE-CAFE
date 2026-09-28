import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  registerOverlay,
  resetOverlayBackForTests,
} from "@/lib/use-overlay-back";

/**
 * What the Android Back button does to the sheets on the till.
 *
 * Everything hard about this is ordering: history.back() is a queued
 * traversal, not a call that has finished by the time it returns, while
 * pushState takes effect at once. Placing an order closes the cart and opens
 * the printed-bill dialog in the same commit, and the first version of this
 * had the cart's unwind still in flight when the dialog pushed — so the
 * traversal landed on the dialog's entry and Back stopped working for it.
 *
 * So the fake history below queues its traversals the way a browser does, and
 * the tests drive the sequences the counter actually produces.
 */

interface Entry {
  href: string;
  state: unknown;
}

function fakeWindow(start = "http://till/pos") {
  const entries: Entry[] = [{ href: start, state: null }];
  let index = 0;
  const listeners: (() => void)[] = [];
  /** Traversals the browser has accepted but not yet applied. */
  const queued: (() => void)[] = [];

  const win = {
    history: {
      get state() {
        return entries[index].state;
      },
      get length() {
        return entries.length;
      },
      pushState(state: unknown) {
        // A push truncates anything ahead of it, exactly like the real thing.
        entries.length = index + 1;
        entries.push({ href: win.location.href, state });
        index += 1;
      },
      back() {
        queued.push(() => {
          if (index === 0) return;
          index -= 1;
          win.location.href = entries[index].href;
          for (const listener of [...listeners]) listener();
        });
      },
    },
    location: { href: start },
    addEventListener(type: string, fn: () => void) {
      if (type === "popstate") listeners.push(fn);
    },
    removeEventListener() {},
  };

  return {
    win,
    /** The user pressing Back. */
    press() {
      if (index === 0) return;
      index -= 1;
      win.location.href = entries[index].href;
      for (const listener of [...listeners]) listener();
    },
    /** Lets the microtasks and any queued traversal run. */
    async settle() {
      for (let round = 0; round < 5; round += 1) {
        await Promise.resolve();
        const pending = queued.splice(0);
        for (const traversal of pending) traversal();
      }
    },
    depth: () => index,
    entries: () => entries.length,
  };
}

/**
 * An overlay that actually goes away when it is asked to.
 *
 * A component closes by unmounting, and it is the unmount that takes it off
 * the stack — so a close callback that only counts would be modelling an
 * overlay that ignores Back, which is its own test further down.
 */
function openOverlay() {
  const overlay = { closed: 0, dispose: () => {} };
  overlay.dispose = registerOverlay(() => {
    overlay.closed += 1;
    overlay.dispose();
  });
  return overlay;
}

let dom: ReturnType<typeof fakeWindow>;

beforeEach(() => {
  resetOverlayBackForTests();
  dom = fakeWindow();
  (globalThis as { window?: unknown }).window = dom.win;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("Back, with one sheet open", () => {
  it("adds one entry to go back to", async () => {
    registerOverlay(() => {});
    await dom.settle();

    expect(dom.entries()).toBe(2);
    expect(dom.depth()).toBe(1);
  });

  it("closes the sheet instead of leaving the page", async () => {
    const sheet = openOverlay();
    await dom.settle();

    dom.press();
    await dom.settle();

    expect(sheet.closed).toBe(1);
    // Back landed on the page's own entry: nothing was navigated away from.
    expect(dom.depth()).toBe(0);
  });

  it("takes its entry back when the sheet is closed by hand", async () => {
    const dispose = registerOverlay(() => {});
    await dom.settle();

    dispose();
    await dom.settle();

    // Otherwise the next Back is swallowed by an entry with nothing behind it.
    expect(dom.depth()).toBe(0);
  });
});

describe("Back, placing an order", () => {
  it("hands the cart's entry to the dialog rather than racing it", async () => {
    // The cart, open.
    const closeCart = registerOverlay(() => {});
    await dom.settle();
    expect(dom.depth()).toBe(1);

    // Place Order: the cart goes and the printed-bill dialog arrives in the
    // same commit, before anything has had a chance to settle.
    closeCart();
    const dialog = openOverlay();
    await dom.settle();

    // One entry between them, and no traversal on the way.
    expect(dom.depth()).toBe(1);

    dom.press();
    await dom.settle();
    expect(dialog.closed).toBe(1);
    expect(dom.depth()).toBe(0);
  });

  it("re-arms when the next overlay opens during the unwind", async () => {
    const closeFirst = registerOverlay(() => {});
    await dom.settle();

    // Closed, then reopened a tick later — long enough for the unwind to have
    // been asked for, not long enough for it to have landed.
    closeFirst();
    await Promise.resolve();

    const second = openOverlay();
    await dom.settle();

    expect(dom.depth()).toBe(1);
    dom.press();
    await dom.settle();
    expect(second.closed).toBe(1);
  });
});

describe("Back, with a confirmation over a sheet", () => {
  it("closes the confirmation and leaves the sheet open", async () => {
    let sheetClosed = 0;
    let confirmClosed = 0;

    registerOverlay(() => {
      sheetClosed += 1;
    });
    await dom.settle();
    const closeConfirm = registerOverlay(() => {
      confirmClosed += 1;
    });
    await dom.settle();

    // Still one entry: the layers are tracked here, not in the history stack.
    expect(dom.depth()).toBe(1);

    dom.press();
    // The component closes and unmounts, which is what removes it.
    closeConfirm();
    await dom.settle();

    expect(confirmClosed).toBe(1);
    expect(sheetClosed).toBe(0);
    // And the sheet has an entry of its own again, so the next Back closes it.
    expect(dom.depth()).toBe(1);
  });

  it("keeps Back pointed at a confirmation that refuses to close", async () => {
    // Mid-request: the buttons are disabled and Back must not be a way round
    // them — nor a way out of the app.
    registerOverlay(() => {});
    await dom.settle();
    registerOverlay(() => {});
    await dom.settle();

    dom.press();
    await dom.settle();

    expect(dom.depth()).toBe(1);
  });
});

describe("Back, when the page has moved on", () => {
  it("does not unwind into a navigation", async () => {
    const dispose = registerOverlay(() => {});
    await dom.settle();

    // A tap on a destination closes the overlay and navigates at once. Going
    // back here would undo the navigation rather than the overlay.
    dom.win.location.href = "http://till/owner/products";
    dispose();
    await dom.settle();

    expect(dom.win.location.href).toBe("http://till/owner/products");
  });
});
