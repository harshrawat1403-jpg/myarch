import { CoreCommitteeSelectionAdmin } from "@/components/selections/core-committee-selection-admin";
export default async function CoreCommitteeSelectionPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CoreCommitteeSelectionAdmin id={id} />; }
