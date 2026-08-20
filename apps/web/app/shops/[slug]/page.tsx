import { ShopDetailClient } from "./shop-detail-client";

export default async function ShopDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <main className="page-shell">
      <section className="hero-compact">
        <span className="eyebrow">Live queue</span>
        <p className="status-text">Check the wait, hold your place, and come back when it&apos;s your turn.</p>
      </section>

      <section className="section">
        <ShopDetailClient slug={params.slug} />
      </section>
    </main>
  );
}
