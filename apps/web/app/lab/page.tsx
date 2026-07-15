import { ManualTestLabClient } from "./manual-test-lab-client";

export default function ManualTestLabPage() {
  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Q-App Device Lab</span>
        <h1>Manual mobile-flow testing on one screen.</h1>
        <p>
          This lab is built for real API validation: auth, customer queueing, smart arrival, operator actions,
          invitations, and business signup from a single responsive surface.
        </p>
      </section>

      <ManualTestLabClient />
    </main>
  );
}
