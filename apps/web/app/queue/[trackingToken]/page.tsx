import { QueueStatusClient } from "./queue-status-client";

export default async function QueueStatusPage(props: {
  params: Promise<{ trackingToken: string }>;
}) {
  const params = await props.params;

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Your place is held</span>
        <h1>Now you can wait somewhere better.</h1>
        <p>
          Keep this page open. Q-App will show your live position and ask for a quick
          yes or no when the shop needs to know if you are coming.
        </p>
      </section>

      <section className="section">
        <h2>Your live status</h2>
        <QueueStatusClient trackingToken={params.trackingToken} />
      </section>
    </main>
  );
}
