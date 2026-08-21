import { AdminBusinessSignups } from "./signups-client";

export default function AdminBusinessSignupsPage() {
  return (
    <main className="page-shell">
      <section className="hero-compact">
        <span className="eyebrow">OnQ Super Admin</span>
        <h1>Shop registrations</h1>
        <p className="status-text">
          Every shop goes live only after a human checks the pin and the details. Approving creates the owner&apos;s login,
          the live shop page, and its QR sign in one step.
        </p>
      </section>

      <section className="section">
        <AdminBusinessSignups />
      </section>
    </main>
  );
}
