import { ShopsClient } from "./shops/shops-client";

const customerPromises = [
  {
    title: "Know before you leave",
    copy: "See the live wait first, so you can decide if now is worth it."
  },
  {
    title: "Hold your place",
    copy: "Join with just your name and phone number. No account, no long form."
  },
  {
    title: "Arrive with purpose",
    copy: "Track your position and respond when the shop needs to know if you are coming."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Q-App for customers</span>
        <h1>Stop waiting in the wrong place.</h1>
        <p>
          Check the real wait, join with your phone, and use your time somewhere better
          until the shop is ready for you.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="/shops">
            Find a live queue
          </a>
          <a className="button" href="/business/signup">
            Register a shop
          </a>
        </div>
      </section>

      <section className="section">
        <h2>How Q-App helps</h2>
        <div className="customer-promise-grid">
          {customerPromises.map((promise) => (
            <article className="card promise-card" key={promise.title}>
              <strong>{promise.title}</strong>
              <p>{promise.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-toolbar">
          <div>
            <span className="eyebrow">Live now</span>
            <h2>Pick a queue by time, not guesswork.</h2>
          </div>
          <a className="button" href="/shops">
            See all shops
          </a>
        </div>
        <ShopsClient />
      </section>
    </main>
  );
}
