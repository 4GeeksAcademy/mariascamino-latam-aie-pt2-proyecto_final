"use client";

import SuppliersDirectory from "./SuppliersDirectory";

// The supplier API requires the user's JWT, which lives in localStorage
// (client-only), so the list is fetched on the client after auth.
export default function SuppliersPage() {
  return <SuppliersDirectory initialSuppliers={null} />;
}
