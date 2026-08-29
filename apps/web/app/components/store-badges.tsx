/** Official-style store badges. URLs are placeholders until the apps are approved. */

export function AppStoreBadge({ href = "#" }: { href?: string }) {
  return (
    <a aria-label="Download on the App Store (coming soon)" className="store-badge" href={href} title="Coming soon to the App Store">
      <svg fill="none" height="54" viewBox="0 0 162 54" width="162" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#000" height="53" rx="9.5" stroke="#A6A6A6" width="161" x="0.5" y="0.5" />
        <path
          d="M33.4 27.6c0-3.4 2.8-5 2.9-5.1-1.6-2.3-4-2.6-4.9-2.7-2.1-.2-4.1 1.2-5.1 1.2-1 0-2.7-1.2-4.4-1.1-2.3 0-4.4 1.3-5.5 3.3-2.4 4.1-.6 10.1 1.7 13.4 1.1 1.6 2.4 3.4 4.2 3.4 1.7-.1 2.3-1.1 4.4-1.1 2 0 2.6 1.1 4.4 1.1 1.8 0 3-1.6 4.1-3.3 1.3-1.9 1.8-3.7 1.8-3.8-.1 0-3.5-1.3-3.6-5.3ZM30 17.6c.9-1.1 1.5-2.7 1.4-4.3-1.3.1-3 .9-3.9 2-.9 1-1.6 2.6-1.4 4.1 1.5.1 3-.7 3.9-1.8Z"
          fill="#fff"
        />
        <text fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="9" x="44" y="22">Download on the</text>
        <text fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="17" fontWeight="600" x="44" y="39">App Store</text>
      </svg>
    </a>
  );
}

export function PlayStoreBadge({ href = "#" }: { href?: string }) {
  return (
    <a aria-label="Get it on Google Play (coming soon)" className="store-badge" href={href} title="Coming soon to Google Play">
      <svg fill="none" height="54" viewBox="0 0 180 54" width="180" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#000" height="53" rx="9.5" stroke="#A6A6A6" width="179" x="0.5" y="0.5" />
        <g transform="translate(12 12)">
          <path d="M1.2.9C.7 1.4.5 2.2.5 3.1v24c0 .9.3 1.7.8 2.2l.1.1L14.9 16v-.3L1.3.8l-.1.1Z" fill="#00D7FE" />
          <path d="m19.4 20.6-4.5-4.5v-.3l4.5-4.5.1.1 5.4 3c1.5.9 1.5 2.3 0 3.2l-5.4 3-.1 0Z" fill="#FFBC00" />
          <path d="m19.5 20.5-4.6-4.6L1.2 29.3c.5.5 1.3.6 2.3.1l16-8.9" fill="#F4374A" />
          <path d="M19.5 11.4 3.5.5C2.5-.1 1.7 0 1.2.6l13.7 13.7 4.6-4.9Z" fill="#00E86D" />
        </g>
        <text fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="9" letterSpacing="0.5" x="48" y="22">GET IT ON</text>
        <text fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="17" fontWeight="600" x="48" y="39">Google Play</text>
      </svg>
    </a>
  );
}
