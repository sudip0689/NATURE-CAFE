"use server";

import { redirect } from "next/navigation";

import { endSession, startSession } from "@/lib/session";

/**
 * The welcome screen has no form — you pick an access route and you are in.
 *
 * There are exactly two, and each is its own action rather than one action
 * taking a role argument. That way the role is decided by *which server
 * function ran*, never by a value the browser sent, so no crafted request can
 * ask for a role that isn't one of these two.
 *
 * Worth restating plainly: with no password, choosing "Café Management" is all
 * it takes to be the owner. This is a shared-device till by design.
 */

export async function enterManagement() {
  await startSession("owner");
  redirect("/owner");
}

export async function openBilling() {
  await startSession("cashier");
  redirect("/pos");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
