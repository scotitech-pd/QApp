const docs = [
  "product-roadmap.md",
  "product-decisions-v1.md",
  "user-flows.md",
  "wireframe-specs.md",
  "data-model.md",
  "mvp-backlog.md"
];

export default function DocsIndexPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Planning Stack</span>
        <h1>Q-App docs drive the build.</h1>
        <p>
          These files in the repository are the current source of truth for
          scope, flows, screens, and data modeling.
        </p>
      </section>

      <section className="section">
        <h2>Core Documents</h2>
        <div className="card-grid">
          {docs.map((name) => (
            <article className="card" key={name}>
              <strong>{name}</strong>
              <p>Open this file from the repository docs folder while building.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
