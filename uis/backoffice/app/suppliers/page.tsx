import SuppliersDirectory from "./SuppliersDirectory";
import { getSuppliers, type Supplier } from "@/lib/suppliers-api";

// Supplier data changes often: render on every request instead of at build time.
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  // Fetch on the server so the table ships in the initial HTML. Previously the
  // page rendered "Cargando…", fetched in useEffect and the table pushed the
  // form down (CLS 0.52). If the API is down we fall back to the client fetch.
  let initialSuppliers: Supplier[] | null = null;
  try {
    initialSuppliers = await getSuppliers({ country: "", category: "" }, { cache: "no-store" });
  } catch {
    initialSuppliers = null;
  }

  return <SuppliersDirectory initialSuppliers={initialSuppliers} />;
}
