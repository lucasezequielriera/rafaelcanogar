import { requireEscritura } from "@/lib/require-permiso";
import { NuevaObraForm } from "./NuevaObraForm";

export default async function NuevaObraPage() {
  await requireEscritura("obras");
  return <NuevaObraForm />;
}
