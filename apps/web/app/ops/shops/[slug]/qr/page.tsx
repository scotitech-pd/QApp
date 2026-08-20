import { QrSignClient } from "./qr-sign-client";

export default async function QrSignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QrSignClient slug={slug} />;
}
