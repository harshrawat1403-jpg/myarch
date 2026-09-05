import { ElectionAdmin } from "@/components/elections/election-admin";
export default async function ElectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ElectionAdmin id={id} />;
}
