import type { Metadata } from "next";

import { SignInClient } from "./signin-client";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the OnQ shop portal to manage your queue, customers and earnings."
};

export default async function SignInPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  return <SignInClient nextPath={searchParams.next ?? null} />;
}
