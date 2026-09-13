import { CoreCommitteeSelectionWorkspace } from "@/components/selections/core-committee-selection-workspace";
export default async function CoreCommitteeSelectioninterviewsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CoreCommitteeSelectionWorkspace id={id} view="interviews" />; }
