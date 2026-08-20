"use client";

import { useEffect, useState } from "react";

import { requestJson, unwrapItem } from "../../../../lib/api";

type Shop = { slug: string; name: string };

const ACTIONS: Array<{ title: string; body: string }> = [
  {
    title: "Call",
    body: "Asks the top customer \"Are you coming?\" on their phone. Do this when a chair is about to free up."
  },
  {
    title: "Start",
    body: "The customer sat down. Tap Start on their row so everyone behind sees an honest wait."
  },
  {
    title: "Done",
    body: "Haircut finished. Tap Done — this is the tap people forget. No Done = the queue looks stuck."
  },
  {
    title: "+ Walk-in",
    body: "Someone walked in without scanning? Add their name. They hold a fair place in the same line."
  },
  {
    title: "Pause / Resume",
    body: "Lunch, breakdown, rush? Pause stops new joins. People already in the queue are not affected."
  }
];

export function StaffGuideClient({ slug }: { slug: string }) {
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    let active = true;
    requestJson<Shop>(`/v1/shops/${slug}`)
      .then((payload) => {
        if (active) setShop(unwrapItem(payload));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div className="qr-sign-shell">
      <div className="qr-sign-toolbar">
        <button className="button primary" onClick={() => window.print()} type="button">
          Print this guide
        </button>
        <p className="status-text">Stick it next to the till, beside the QR sign.</p>
      </div>

      <div className="qr-sign staff-guide">
        <p className="qr-sign-kicker">OnQ · staff guide</p>
        <h1 className="qr-sign-title">{shop?.name ?? "Your shop"}</h1>
        <p className="qr-sign-sub">Running the queue is five taps. Nothing else.</p>

        <ol className="staff-guide-list">
          {ACTIONS.map((action, index) => (
            <li key={action.title}>
              <strong>
                {index + 1}. {action.title}
              </strong>
              <span>{action.body}</span>
            </li>
          ))}
        </ol>

        <p className="qr-sign-note">
          A missed customer moves to &quot;Missed turn&quot; — tap Re-add if they show up. If a cut runs long, tap +10 min
          so waiting customers see the truth.
        </p>
        <p className="qr-sign-brand">OnQ</p>
      </div>
    </div>
  );
}
