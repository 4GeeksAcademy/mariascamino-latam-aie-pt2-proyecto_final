"use client";

import dynamic from "next/dynamic";

/**
 * Lazy loading #2 — ErrorState, loaded only when something actually fails.
 *
 * ErrorState is imported by the protected (app) layout, so a static import
 * puts it in the bundle of EVERY backoffice page, although it is only rendered
 * on the failure path (API down, session check failed). With next/dynamic it
 * becomes its own chunk that the browser fetches the first time an error is
 * shown. Same props as ErrorState; drop-in replacement.
 */
const LazyErrorState = dynamic(() => import("./ErrorState"), {
  // While the ~1 KB chunk arrives, keep an accessible placeholder so screen
  // readers still hear that something went wrong.
  loading: () => (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
      Algo salió mal…
    </div>
  ),
});

export default LazyErrorState;
