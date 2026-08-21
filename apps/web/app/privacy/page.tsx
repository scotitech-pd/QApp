export default function PrivacyPage() {
  return (
    <main className="page-shell legal-page">
      <section className="hero-compact">
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="status-text">Last updated: 21 August 2026 · OnQ by Scotitech Solutions Limited</p>
      </section>
      <section className="section legal-body">
        <h2>What we collect</h2>
        <ul className="list">
          <li><strong>To join a queue:</strong> your first name and mobile number, so the shop can call you and we can verify the number.</li>
          <li><strong>If you sign in (optional):</strong> your name, email address and profile picture from Google or Apple, used only to show your visit history and favourites.</li>
          <li><strong>Location (optional):</strong> used on your device to sort salons by distance. We do not store your location history.</li>
          <li><strong>Notifications (optional):</strong> a device push token so we can tell you when it is your turn.</li>
          <li><strong>Visit records:</strong> which shop you joined, when, and any rating you leave. Shops see your first name and a masked number.</li>
        </ul>
        <h2>What we do not do</h2>
        <ul className="list">
          <li>We do not sell personal data.</li>
          <li>We do not show ads or share data with advertisers.</li>
          <li>We do not track you across other apps or websites.</li>
        </ul>
        <h2>Who can see your data</h2>
        <p>The shop you queue at sees your first name, masked phone number and visit times. Our hosting providers (database and API hosting) process data on our behalf under contract. Nobody else.</p>
        <h2>Retention</h2>
        <p>Queue records are kept so shops have honest service history. You can delete your account at any time from the app (Me → Account → Delete account) or via the <a href="/account-deletion">account deletion page</a>; personal details are removed and remaining records are anonymised.</p>
        <h2>Your rights</h2>
        <p>You can access, correct or delete your data at any time. Contact <a href="mailto:privacy@scotitech.com">privacy@scotitech.com</a>.</p>
        <h2>Children</h2>
        <p>OnQ is not directed at children under 13 and we do not knowingly collect their data.</p>
        <h2>Changes</h2>
        <p>We will post any changes here and update the date above.</p>
      </section>
    </main>
  );
}
