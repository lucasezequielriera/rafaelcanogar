import { redirect } from "next/navigation";

type Search = { [key: string]: string | string[] | undefined };

export default async function ContabilidadRedirect({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) qs.set(k, v);
    else if (Array.isArray(v)) {
      for (const x of v) {
        if (x) qs.append(k, x);
      }
    }
  }
  const s = qs.toString();
  redirect(s ? `/dashboard?${s}` : "/dashboard");
}
