import { QueueDashboardClient } from "./queue-dashboard-client";

export default async function QueueDashboardPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Q-App Shop Portal</span>
        <h1>See the live queue and run the shop floor.</h1>
        <p>
          Shop owners and staff can see how many customers are waiting, call the next customer,
          add walk-ins, manage intake, and keep the queue moving.
        </p>
      </section>

      <section className="section">
        <h2>Shop Portal</h2>
        <QueueDashboardClient slug={params.slug} />
      </section>
    </main>
  );
}
