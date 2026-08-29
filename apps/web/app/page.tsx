import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OnQ — Skip the wait at your barber or salon",
  description:
    "OnQ shows live wait times at barbers and salons near you. Join the queue from home, get told when to leave, and walk straight into the chair. Free for shops during the pilot.",
  keywords: [
    "salon queue app",
    "barber queue app",
    "live wait times",
    "skip the wait",
    "queue management",
    "walk-in booking",
    "OnQ",
    "Scotitech"
  ],
  alternates: { canonical: "https://onq.scotitech.com" },
  openGraph: {
    title: "OnQ — Skip the wait",
    description: "Live salon wait times. Join the queue from anywhere, arrive when it's your turn.",
    url: "https://onq.scotitech.com",
    siteName: "OnQ",
    type: "website",
    images: [{ url: "https://onq.scotitech.com/icons/icon-512.png", width: 512, height: 512, alt: "OnQ logo" }]
  },
  twitter: {
    card: "summary",
    title: "OnQ — Skip the wait",
    description: "Live salon wait times. Join the queue from anywhere.",
    images: ["https://onq.scotitech.com/icons/icon-512.png"]
  },
  robots: { index: true, follow: true }
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OnQ",
  operatingSystem: "Android, iOS, Web",
  applicationCategory: "LifestyleApplication",
  description:
    "Real-time queue platform for barbers and salons. Customers see live wait times and join remotely; shops manage their floor, customers and earnings.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  publisher: {
    "@type": "Organization",
    name: "Scotitech Solutions",
    url: "https://scotitech.com",
    email: "info@scotitech.com"
  },
  url: "https://onq.scotitech.com"
};

const customerSteps = [
  {
    title: "See the real wait",
    copy: "Open OnQ and see every nearby shop with its live queue — how many waiting, how long it will take."
  },
  {
    title: "Join from anywhere",
    copy: "Hold your place from home, work, or the shop's QR sign. Name and phone — no account needed."
  },
  {
    title: "Walk in on time",
    copy: "OnQ tells you when to leave and the shop confirms you're coming. You arrive as the chair opens."
  }
];

const ownerFeatures = [
  { title: "Live floor board", copy: "Call next, start service, one-tap complete with a service tag. Updates in real time on every device." },
  { title: "Customer records", copy: "Every visit is recorded — walk-ins and app joins alike. Ratings come only from real completed visits." },
  { title: "Earnings view", copy: "Served today, service mix and busy hours, without any till integration." },
  { title: "Your page and photos", copy: "Logo, shop photos, opening hours and a printable QR counter sign — set up in minutes from the app." }
];

export default function HomePage() {
  return (
    <main className="page-shell marketing">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} type="application/ld+json" />

      <section className="hero">
        <span className="eyebrow">Skip the wait</span>
        <h1>The queue is real. Your waiting doesn't have to be.</h1>
        <p>
          OnQ shows live wait times at barbers and salons near you. Join the queue from wherever you are,
          get told when to leave, and walk straight into the chair.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="/downloads/OnQ-latest.apk" rel="noopener">
            Get the Android app
          </a>
          <a className="button" href="/shops">
            Use OnQ in the browser
          </a>
        </div>
        <p className="hero-footnote">
          iOS app coming to TestFlight soon · Android APK is a direct download during the pilot
        </p>
      </section>

      <section className="section screens" aria-label="App screenshots">
        <figure>
          <img alt="OnQ home screen showing nearby salons on a countryside path with live wait times" height={720} loading="lazy" src="/marketing/map.png" width={332} />
          <figcaption>Nearby shops, live waits</figcaption>
        </figure>
        <figure>
          <img alt="Shop card with rating, waiting count, estimated wait and a join-the-queue button" height={720} loading="lazy" src="/marketing/detail.png" width={332} />
          <figcaption>Join in two taps</figcaption>
        </figure>
        <figure>
          <img alt="Shop owner pinning their shop location on a map during registration" height={720} loading="lazy" src="/marketing/pin.png" width={332} />
          <figcaption>Shops set up in minutes</figcaption>
        </figure>
      </section>

      <section className="section">
        <h2>How it works for customers</h2>
        <div className="customer-promise-grid">
          {customerSteps.map((step, index) => (
            <article className="promise-card" key={step.title}>
              <span className="step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Built for shop owners too</h2>
        <p className="section-lede">
          OnQ replaces the crowd at the door with an orderly, visible queue — and gives you the records a
          notebook never could. Free during the pilot, no card, no contract.
        </p>
        <div className="customer-promise-grid">
          {ownerFeatures.map((feature) => (
            <article className="promise-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
        <div className="hero-actions" style={{ marginTop: "1.4rem" }}>
          <a className="button primary" href="/business/signup">
            Register your shop — free
          </a>
        </div>
      </section>

      <section className="section trust">
        <h2>Fair by design</h2>
        <ul className="trust-list">
          <li>Ratings come only from verified, completed visits — no anonymous reviews.</li>
          <li>Walk-ins and app joins share one honest queue. Nobody jumps the line.</li>
          <li>Your number is used for your turn alerts, nothing else. Delete your account any time.</li>
        </ul>
      </section>

      <footer className="marketing-footer">
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/account-deletion">Account Deletion</Link>
          <a href="mailto:info@scotitech.com">Contact</a>
        </nav>
        <p>
          OnQ is a product of <a href="https://scotitech.com">Scotitech Solutions</a>. No tracking cookies —
          only what's needed to run your queue.
        </p>
      </footer>
    </main>
  );
}
