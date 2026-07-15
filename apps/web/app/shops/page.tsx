import { ShopsClient } from "./shops-client";

export default function ShopsPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Find a queue</span>
        <h1>Choose the shop that respects your time.</h1>
        <p>
          The important question is simple: how long is the wait, how far is it,
          and can you join without standing there?
        </p>
      </section>

      <section className="section">
        <h2>Nearby live queues</h2>
        <ShopsClient />
      </section>
    </main>
  );
}
