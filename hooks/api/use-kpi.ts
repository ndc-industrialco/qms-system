import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface KpiSubmitPayload {
  prepareSignature: string;
  reviewerUserId: string;
  approverUserId: string;
}

export interface KpiQuery {
  page?: number;
  limit?: number;
  yearly?: number;
  department?: string;
}

export interface KpiPayload {
  yearly: number;
  department: string;
  prepare: string;
  reviewer: string;
  approver: string;
}

export interface KpiObjectivePayload {
  target: number;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments?: string;
}

async function extractError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json.error?.message ?? json.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function buildParams(q: KpiQuery): string {
  const p = new URLSearchParams();
  if (q.page) p.set("page", String(q.page));
  if (q.limit) p.set("limit", String(q.limit));
  if (q.yearly) p.set("yearly", String(q.yearly));
  if (q.department) p.set("department", q.department);
  return p.toString();
}

export function useKpiList(query: KpiQuery) {
  return useQuery({
    queryKey: ["kpi", query],
    queryFn: async () => {
      const res = await fetch(`/api/kpi?${buildParams(query)}`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
  });
}

export function useKpiById(id: string | null) {
  return useQuery({
    queryKey: ["kpi", id],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/${id}`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateKpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: KpiPayload) => {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kpi"] }),
  });
}

export function useUpdateKpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KpiPayload> }) => {
      const res = await fetch(`/api/kpi/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["kpi"] });
      qc.invalidateQueries({ queryKey: ["kpi", id] });
    },
  });
}

export function useDeleteKpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/kpi/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kpi"] }),
  });
}

export function useKpiObjectives(kpiId: string | null) {
  return useQuery({
    queryKey: ["kpiObjectives", kpiId],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/${kpiId}/objectives`);
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    enabled: !!kpiId,
  });
}

export function useAddObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, data }: { kpiId: string; data: KpiObjectivePayload }) => {
      const res = await fetch(`/api/kpi/${kpiId}/objectives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId }) => {
      qc.invalidateQueries({ queryKey: ["kpiObjectives", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpi", kpiId] });
    },
  });
}

export function useUpdateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, objectiveId, data }: { kpiId: string; objectiveId: string; data: Partial<KpiObjectivePayload> }) => {
      const res = await fetch(`/api/kpi/${kpiId}/objectives/${objectiveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId }) => {
      qc.invalidateQueries({ queryKey: ["kpiObjectives", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpi", kpiId] });
    },
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, objectiveId }: { kpiId: string; objectiveId: string }) => {
      const res = await fetch(`/api/kpi/${kpiId}/objectives/${objectiveId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId }) => {
      qc.invalidateQueries({ queryKey: ["kpiObjectives", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpi", kpiId] });
    },
  });
}

export function useSubmitKpiObjectives() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, data }: { kpiId: string; data: KpiSubmitPayload }) => {
      const res = await fetch(`/api/kpi/${kpiId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await extractError(res));
      return res.json();
    },
    onSuccess: (_, { kpiId }) => {
      qc.invalidateQueries({ queryKey: ["kpi", kpiId] });
      qc.invalidateQueries({ queryKey: ["kpi"] });
    },
  });
}
