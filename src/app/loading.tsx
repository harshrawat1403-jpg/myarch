import { LoadingScreen } from "@/components/loading-screen";

/**
 * Next.js's route-transition loading convention file — shown automatically
 * while a page segment's data/Suspense boundary resolves during
 * navigation, distinct from (and in addition to) each protected layout's
 * own auth-check loading state.
 */
export default function Loading() {
  return <LoadingScreen />;
}
