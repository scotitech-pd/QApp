export default function AccountDeletionPage() {
  return (
    <main className="page-shell legal-page">
      <section className="hero-compact">
        <span className="eyebrow">Your data</span>
        <h1>Delete your OnQ account</h1>
        <p className="status-text">Two ways, both free and permanent.</p>
      </section>
      <section className="section legal-body">
        <h2>In the app (instant)</h2>
        <ol className="list">
          <li>Open OnQ and go to the <strong>Me</strong> tab.</li>
          <li>Scroll to <strong>Account</strong> and tap <strong>Delete account</strong>.</li>
          <li>Confirm. Your name, email, phone number, profile picture and sign-in links are removed immediately.</li>
        </ol>
        <h2>By email</h2>
        <p>Email <a href="mailto:privacy@scotitech.com?subject=Delete%20my%20OnQ%20account">privacy@scotitech.com</a> from the address you signed in with (or include the mobile number you used to join queues). We complete requests within 7 days.</p>
        <h2>What is deleted and what is kept</h2>
        <ul className="list">
          <li><strong>Deleted:</strong> name, email, phone number, profile picture, Google/Apple sign-in links, favourites, notification tokens.</li>
          <li><strong>Anonymised and kept:</strong> queue visit records (date, shop, duration) so shops&apos; service history stays accurate. They can no longer be linked to you.</li>
        </ul>
      </section>
    </main>
  );
}
