import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { KpiRepository } from "@/repositories/kpiRepository";
import FmMr01PrintTemplate from "@/components/kpi/FmMr01PrintTemplate";

const kpiRepo = new KpiRepository();

type Props = { searchParams: Promise<{ year?: string }> };

export const metadata = { title: "FM-MR-01 Master Print" };

export default async function FmMr01PrintPage({ searchParams }: Props) {
  await requireAuth();
  const params = await searchParams;
  const yearStr = params.year;
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    notFound();
  }

  // Fetch KPIs for the requested year.
  // We can filter to only include APPROVED if strictly required, but for a master report,
  // showing all or filtering via DB is up to the business logic. We'll show all existing ones.
  const kpis = await kpiRepo.findForExport({ yearly: year });
  
  return <FmMr01PrintTemplate kpis={kpis} year={year} />;
}
