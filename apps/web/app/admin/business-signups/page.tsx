import { AdminBusinessSignups } from "./signups-client";

export default function AdminBusinessSignupsPage() {
  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Q-App Admin</span>
        <h1>Approve businesses only after the real signup data checks out.</h1>
        <p>
          This review screen now runs on the protected admin APIs and is designed for
          quick location and quality checks on phones as well as desktop.
        </p>
      </section>

      <section className="section">
        <h2>Pending Signups</h2>
        <AdminBusinessSignups />
      </section>
    </main>
  );
}
