import { SignInClient } from "./signin-client";

export default async function SignInPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Shop/Admin Sign In</span>
        <h1>Manage queues, staff access, and admin reviews.</h1>
        <p>
          Customers do not need to sign in to join a queue. This screen is only for shop teams
          and Q-App admins.
        </p>
      </section>

      <section className="section">
        <SignInClient nextPath={searchParams.next ?? null} />
      </section>
    </main>
  );
}
