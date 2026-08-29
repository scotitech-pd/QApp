import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "./components/reveal";
import { AppStoreBadge, PlayStoreBadge } from "./components/store-badges";

export const metadata: Metadata = {
  title: "OnQ — Skip the wait at your barber or salon",
  description:
    "OnQ shows live wait times at barbers and salons near you. Join the queue from home, get told when to leave, and walk straight into the chair. Free for shops during the pilot.",
  keywords: [
    "salon queue app",
    "barber queue app",
    "live wait times",
    "skip the wait",
    "queue management app",
    "walk-in queue",
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
  publisher: { "@type": "Organization", name: "Scotitech Solutions", url: "https://scotitech.com", email: "info@scotitech.com" },
  url: "https://onq.scotitech.com"
};

function IconClock() {
  return (
    <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="26">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="26">
      <rect height="18" rx="3" width="12" x="6" y="3" />
      <path d="M10 18h4" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="26">
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}
function IconBoard() {
  return (
    <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="26">
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M7 9h6M7 13h10M7 17h4" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="26">
      <path d="M4 20V6M4 20h16" />
      <path d="m8 15 3.5-4 3 2.5L19 8" />
    </svg>
  );
}
function IconQr() {
  return (
    <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="26">
      <rect height="6" rx="1" width="6" x="4" y="4" />
      <rect height="6" rx="1" width="6" x="14" y="4" />
      <rect height="6" rx="1" width="6" x="4" y="14" />
      <path d="M14 14h3v3h-3zM19 19h1M14 20h1.5M20 14v1.5" />
    </svg>
  );
}

const oldWay = [
  "You walk in, count six heads, and settle onto a plastic bench for an hour.",
  "Calling ahead gets a shrug — \"depends who turns up\".",
  "Walk away and you lose your place; stay and you lose your evening.",
  "The owner juggles the chair, the phone and the door — and still gets blamed for the wait."
];

const onqWay = [
  "Open OnQ and see every nearby shop with its live queue before you leave home.",
  "Join remotely with just your name and number — or scan the QR at the counter.",
  "OnQ tells you when to leave. The shop confirms you're on your way.",
  "The owner runs the floor from one screen: call next, start, done. Everyone sees the same queue."
];

const capabilities = [
  { icon: <IconClock />, title: "Live wait times", copy: "Every shop shows its real queue — how many waiting and roughly how long — updated the moment anything changes." },
  { icon: <IconPhone />, title: "Join from anywhere", copy: "Hold your place from home or work. No account, no app store visit needed — the web queue works from the QR sign too." },
  { icon: <IconBell />, title: "Leave-on-time alerts", copy: "OnQ works out when you should head over and pings you. Arrive as the chair opens, not an hour early." },
  { icon: <IconBoard />, title: "Owner floor board", copy: "Call next, start service, one-tap complete with a service tag. Walk-ins and app joins share one honest queue." },
  { icon: <IconChart />, title: "Records & earnings", copy: "Served today, service mix, busy hours and repeat customers — the numbers a notebook never gave you." },
  { icon: <IconQr />, title: "Your page, photos & QR", copy: "Logo, shop photos, opening hours and a printable counter sign. Set up from the phone in minutes." }
];

export default function HomePage() {
  return (
    <main className="mkt">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} type="application/ld+json" />

      {/* ---------- HERO ---------- */}
      <section className="mkt-hero">
        <div className="mkt-hero-glow" aria-hidden />
        <div className="mkt-hero-inner">
          <div className="mkt-hero-copy">
            <span className="mkt-pill">
              <span className="mkt-pill-tag">PILOT</span>
              Now onboarding barbers &amp; salons — free, no card
            </span>
            <h1>
              Skip the wait.
              <br />
              <span className="mkt-accent">Not the haircut.</span>
            </h1>
            <p>
              OnQ shows live wait times at shops near you. Join the queue from wherever you are, get told
              exactly when to leave, and walk straight into the chair.
            </p>
            <div className="mkt-badges">
              <AppStoreBadge />
              <PlayStoreBadge />
            </div>
            <p className="mkt-hero-alt">
              Store listings coming soon · <a href="/downloads/OnQ-latest.apk">direct Android APK</a> for pilot
              partners · <Link href="/shops">or use OnQ in the browser</Link>
            </p>
            <dl className="mkt-stats">
              <div>
                <dt>Queue updates</dt>
                <dd>Real-time</dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>Verified visits only</dd>
              </div>
              <div>
                <dt>For shops</dt>
                <dd>Free pilot</dd>
              </div>
            </dl>
          </div>
          <div className="mkt-hero-phone">
            <div className="mkt-phone-frame">
              <img alt="OnQ app showing nearby salons with live wait times on an illustrated path" height="1000" src="/marketing/map.png" width="461" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- OLD WAY / ONQ WAY ---------- */}
      <section className="mkt-section">
        <Reveal>
          <span className="mkt-eyebrow">The old way</span>
          <h2>Walk-in culture wastes everyone's time.</h2>
        </Reveal>
        <div className="mkt-compare">
          <Reveal>
            <ul className="mkt-list mkt-list-bad">
              {oldWay.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="mkt-way-card">
              <span className="mkt-eyebrow light">The OnQ way</span>
              <ul className="mkt-list mkt-list-good">
                {onqWay.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- CAPABILITIES ---------- */}
      <section className="mkt-section">
        <Reveal>
          <span className="mkt-eyebrow">Product</span>
          <h2>Everything a walk-in shop needs. Nothing it doesn't.</h2>
        </Reveal>
        <div className="mkt-grid">
          {capabilities.map((capability, index) => (
            <Reveal delay={index * 70} key={capability.title}>
              <article className="mkt-card">
                <span className="mkt-card-icon">{capability.icon}</span>
                <h3>{capability.title}</h3>
                <p>{capability.copy}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- SCREENSHOTS ---------- */}
      <section className="mkt-section mkt-screens-band">
        <Reveal>
          <span className="mkt-eyebrow">In the app</span>
          <h2>Serious tool, friendly face.</h2>
        </Reveal>
        <div className="mkt-screens">
          <Reveal>
            <figure>
              <img alt="Nearby salons on an illustrated countryside path with live waits" loading="lazy" src="/marketing/map.png" />
              <figcaption>Nearby shops, live waits</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={120}>
            <figure className="mkt-screen-raised">
              <img alt="Shop card with rating, waiting count and join button" loading="lazy" src="/marketing/detail.png" />
              <figcaption>Join in two taps</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={240}>
            <figure>
              <img alt="Shop owner pinning their location on a map during registration" loading="lazy" src="/marketing/pin.png" />
              <figcaption>Shops set up in minutes</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ---------- OWNER BAND ---------- */}
      <section className="mkt-owner">
        <div className="mkt-owner-inner">
          <Reveal>
            <span className="mkt-eyebrow light">For shop owners</span>
            <h2>Your waiting room, without the waiting room.</h2>
            <p>
              Register in five minutes from your phone. We review every shop by hand — usually the same day —
              and the pilot is completely free. No card, no contract, no per-customer fees.
            </p>
            <div className="mkt-owner-actions">
              <Link className="mkt-cta" href="/business/signup">
                Register your shop
              </Link>
              <Link className="mkt-cta ghost" href="/signin">
                Shop sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- TRUST ---------- */}
      <section className="mkt-section">
        <Reveal>
          <span className="mkt-eyebrow">Fair by design</span>
          <h2>Trust is the product.</h2>
          <ul className="mkt-trust">
            <li>Ratings come only from verified, completed visits — no anonymous reviews, no fakes.</li>
            <li>Walk-ins and app joins share one honest queue. Nobody pays to jump the line.</li>
            <li>Your number is used for turn alerts, nothing else. Delete your account and data any time.</li>
          </ul>
        </Reveal>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="mkt-footer">
        <div className="mkt-footer-inner">
          <div className="mkt-footer-brand">
            <img alt="" height="34" src="/icons/icon-192.png" width="34" />
            <div>
              <strong>OnQ</strong>
              <small>Skip the wait</small>
            </div>
          </div>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/account-deletion">Account Deletion</Link>
            <a href="mailto:info@scotitech.com">Contact</a>
          </nav>
          <p>
            OnQ is a product of <a href="https://scotitech.com">Scotitech Solutions</a>. No tracking cookies —
            only what's needed to run your queue. App Store and Google Play badges shown ahead of store
            availability.
          </p>
        </div>
      </footer>
    </main>
  );
}
