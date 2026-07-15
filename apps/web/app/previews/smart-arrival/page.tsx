export default function SmartArrivalPreviewPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Q-App Preview</span>
        <h1>Smart arrival in one glance</h1>
        <p>
          This preview shows the new `near turn`, `Are you coming?`, and operator confirmation states
          without needing a live database.
        </p>
      </section>

      <section className="section">
        <div className="dashboard-columns">
          <article className="card shop-detail-card">
            <strong>Customer Status</strong>
            <p>
              Shop: Fade Yard Soho
              <br />
              City: London
            </p>
            <p>
              Position: 1
              <br />
              Queue size: 4
              <br />
              Estimated wait: 4 min
            </p>
            <p>
              Visit status: CONFIRMATION_PENDING
              <br />
              Confirmation: PENDING
            </p>
            <p className="status-callout">Near-turn alert sent at 14:22.</p>
            <div className="status-panel status-panel-warn">
              <strong>Are you coming?</strong>
              <p>Confirm before 14:27 or Q-App will release this place and promote the next customer.</p>
              <div className="location-actions">
                <button className="button primary" type="button">
                  Yes, I am coming
                </button>
                <button className="button" type="button">
                  No, release my place
                </button>
              </div>
            </div>
          </article>

          <article className="card dashboard-column">
            <strong>Operator Queue</strong>
            <div className="dashboard-list">
              <article className="dashboard-row">
                <div>
                  <strong>Amir K.</strong>
                  <p>
                    Position: 1
                    <br />
                    Status: CONFIRMATION_PENDING
                    <br />
                    ETA: 4 min
                  </p>
                  <div className="status-stack">
                    <span className="pill pill-warn">Confirmation: PENDING</span>
                    <span className="status-text">Asked at 14:22</span>
                  </div>
                </div>
                <div className="location-actions">
                  <button className="button" type="button">
                    Call
                  </button>
                  <button className="button primary" type="button">
                    Start
                  </button>
                </div>
              </article>

              <article className="dashboard-row">
                <div>
                  <strong>Joel R.</strong>
                  <p>
                    Position: 2
                    <br />
                    Status: QUEUED
                    <br />
                    ETA: 18 min
                  </p>
                  <div className="status-stack">
                    <span className="pill pill-good">Near turn sent</span>
                    <span className="status-text">Waiting for the front slot to clear</span>
                  </div>
                </div>
              </article>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
