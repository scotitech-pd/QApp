import { SignInClient } from "../../signin/signin-client";

export default function ShopSignInPage() {
  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Shop Owner Sign In</span>
        <h1>Open your shop portal.</h1>
        <p>
          Sign in to see your live queue, call the next customer, extend service time, update your shop profile,
          and manage day-to-day queue operations.
        </p>
      </section>

      <section className="section">
        <SignInClient nextPath="/shop/dashboard" />
      </section>
    </main>
  );
}
