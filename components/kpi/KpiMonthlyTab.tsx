"use client";

import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";

interface Props {
  canApprove: boolean;
}

export default function KpiMonthlyTab({ canApprove }: Props) {
  return <KpiMonthlyClient canApprove={canApprove} />;
}
