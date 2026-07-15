import { ShopDetailClient } from "./shop-detail-client";

export default async function ShopDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Before you go</span>
        <h1>Check the wait. Join only if it works for you.</h1>
        <p>
          No login. No appointment pressure. Just the current queue, the expected wait,
          and a quick way to hold your place.
        </p>
      </section>

      <section className="section">
        <h2>Live queue</h2>
        <ShopDetailClient slug={params.slug} />
      </section>
    </main>
  );
}
