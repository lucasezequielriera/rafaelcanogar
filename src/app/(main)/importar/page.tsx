import { requireImportarCsv } from "@/lib/require-permiso";
import { ImportarCsvClient } from "./ImportarCsvClient";

export default async function ImportarPage() {
  await requireImportarCsv();
  return <ImportarCsvClient />;
}
