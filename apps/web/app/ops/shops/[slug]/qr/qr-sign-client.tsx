"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { requestJson, unwrapItem } from "../../../../lib/api";

type Shop = {
  slug: string;
  name: string;
  city?: string | null;
};

export function QrSignClient({ slug }: { slug: string }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await requestJson<Shop>(`/v1/shops/${slug}`);
        const item = unwrapItem(payload);
        if (!active || !item) return;
        setShop(item);

        const joinUrl = `${window.location.origin}/shops/${slug}`;
        const dataUrl = await QRCode.toDataURL(joinUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 640,
          color: { dark: "#1D1F20", light: "#FFFFFF" }
        });
        if (active) setQrDataUrl(dataUrl);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load the shop.");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (error) {
    return <p className="status-text warning">{error}</p>;
  }

  if (!shop || !qrDataUrl) {
    return <p className="status-text">Preparing the sign…</p>;
  }

  return (
    <div className="qr-sign-shell">
      <div className="qr-sign-toolbar">
        <button className="button primary" onClick={() => window.print()} type="button">
          Print this sign
        </button>
        <p className="status-text">A5 or A4. Put it on the counter and in the window.</p>
      </div>

      <div className="qr-sign">
        <p className="qr-sign-kicker">Skip the wait</p>
        <h1 className="qr-sign-title">{shop.name}</h1>
        <p className="qr-sign-sub">Scan to join the queue from your phone</p>
        <img alt={`QR code to join the queue at ${shop.name}`} className="qr-sign-code" src={qrDataUrl} />
        <p className="qr-sign-note">No app needed · live wait on your phone · we tell you when to come back</p>
        <p className="qr-sign-brand">OnQ</p>
      </div>
    </div>
  );
}
