import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditAppointmentRow } from "@/types/audit";
import type { AuditAppointmentCreateInput, AuditAppointmentRejectInput } from "@/lib/validations/audit";

export type AuditMemberUser = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
  employeeId: string | null;
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const auditAppointmentKeys = {
  all: ["audit-appointments"] as const,
  list: () => ["audit-appointments", "list"] as const,
  detail: (id: string) => ["audit-appointments", "detail", id] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAppointments(): Promise<AuditAppointmentRow[]> {
  const res = await fetch("/api/audit/appointments");
  if (!res.ok) throw new Error("Failed to fetch appointments");
  const json = await res.json();
  return json.data ?? [];
}

async function fetchAppointmentById(id: string): Promise<AuditAppointmentRow> {
  const res = await fetch(`/api/audit/appointments/${id}`);
  if (!res.ok) throw new Error("Failed to fetch appointment");
  const json = await res.json();
  return json.data;
}

async function createAppointment(input: AuditAppointmentCreateInput): Promise<AuditAppointmentRow> {
  const res = await fetch("/api/audit/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string }; message?: string }).error?.message ??
        (json as { message?: string }).message ??
        "Failed to create appointment"
    );
  }
  const json = await res.json();
  return json.data;
}

async function submitAppointment(id: string): Promise<AuditAppointmentRow> {
  const res = await fetch(`/api/audit/appointments/${id}/submit`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ?? "Failed to submit"
    );
  }
  const json = await res.json();
  return json.data;
}

async function reviewAppointment(id: string): Promise<AuditAppointmentRow> {
  const res = await fetch(`/api/audit/appointments/${id}/review`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ?? "Failed to review"
    );
  }
  const json = await res.json();
  return json.data;
}

async function approveAppointment(id: string): Promise<AuditAppointmentRow> {
  const res = await fetch(`/api/audit/appointments/${id}/approve`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ?? "Failed to approve"
    );
  }
  const json = await res.json();
  return json.data;
}

async function rejectAppointment(id: string, input: AuditAppointmentRejectInput): Promise<AuditAppointmentRow> {
  const res = await fetch(`/api/audit/appointments/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ?? "Failed to reject"
    );
  }
  const json = await res.json();
  return json.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditAppointments(initialData?: AuditAppointmentRow[]) {
  return useQuery({
    queryKey: auditAppointmentKeys.list(),
    queryFn: fetchAppointments,
    initialData,
  });
}

export function useAuditAppointment(id: string, initialData?: AuditAppointmentRow) {
  return useQuery({
    queryKey: auditAppointmentKeys.detail(id),
    queryFn: () => fetchAppointmentById(id),
    initialData,
    enabled: !!id,
  });
}

export function useCreateAuditAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.all });
    },
  });
}

export function useSubmitAuditAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitAppointment(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.all });
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.detail(id) });
    },
  });
}

export function useReviewAuditAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewAppointment(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.all });
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.detail(id) });
    },
  });
}

export function useApproveAuditAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveAppointment(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.all });
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.detail(id) });
    },
  });
}

export function useAuditMemberUsers() {
  return useQuery({
    queryKey: ["audit-member-users"],
    queryFn: async (): Promise<AuditMemberUser[]> => {
      const res = await fetch("/api/audit/appointments/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRejectAuditAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AuditAppointmentRejectInput }) =>
      rejectAppointment(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.all });
      qc.invalidateQueries({ queryKey: auditAppointmentKeys.detail(id) });
    },
  });
}
