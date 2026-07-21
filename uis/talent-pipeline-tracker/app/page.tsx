import { Suspense } from "react";
import { CandidatesView } from "@/components/CandidatesView";
import { LoadingState } from "@/components/LoadingState";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CandidatesView />
    </Suspense>
  );
}