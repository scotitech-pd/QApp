import { BusinessSignupForm } from "./signup-form";

export default function BusinessSignupPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Q-App Business Signup</span>
        <h1>Register your shop and confirm the exact storefront location.</h1>
        <p>
          Q-App uses your saved coordinates for nearby discovery, distance
          calculations, and future smart-arrival timing. Location confirmation is
          mandatory before signup can be submitted.
        </p>
      </section>

      <section className="section">
        <h2>Signup Flow</h2>
        <p>
          Fill in the business details, detect or search the location, adjust the
          map pin if needed, then explicitly confirm the final pin before
          submission.
        </p>
        <BusinessSignupForm />
      </section>
    </main>
  );
}
