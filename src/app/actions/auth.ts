"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { AUTH_PROVIDER_ID } from "@/infrastructure/auth/provider";
import { signIn, signOut } from "@/infrastructure/auth/auth";
import { signOutFromApp } from "@/infrastructure/auth/logout";

export async function signInWithSso() {
  try {
    await signIn(AUTH_PROVIDER_ID, { redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=sso");
    }
    throw error;
  }
}

export async function signOutAction() {
  await signOutFromApp();
}

/** Local cookie only — used by the 403 page so an inactive session can reach /login. */
export async function dismissForbidden() {
  await signOut({ redirect: false });
  redirect("/login");
}
