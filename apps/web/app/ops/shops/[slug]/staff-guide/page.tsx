import { StaffGuideClient } from "./staff-guide-client";

export default async function StaffGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StaffGuideClient slug={slug} />;
}
