"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/dar/SignaturePad";
import { useReviewerCandidates, type ReviewerCandidate } from "@/hooks/api/use-reviewer-candidates";
import { useDepartments } from "@/hooks/api/use-departments";
import { useEmailGroups } from "@/hooks/api/use-email-groups";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApptMember = { authUserId: string; name: string; role: string };

type Appointment = {
  id: string;
  appointmentNo: string;
  year: number;
  title: string;
  standards: string[];
  members: ApptMember[];
};

type DbStandard = { id: string; name: string };

type TeamMemberEntry = {
  authUserId: string;
  name: string;
  email: string | null;
  role: "LEAD_AUDITOR" | "AUDITOR" | "OBSERVER" | "AUDITEE";
};

type DeptScheduleEntry = {
  departmentId: string;
  departmentName: string;
  enabled: boolean;
  startAt: string;
  endAt: string;
  location: string;
  contactEmail: string;
  auditeeNotifyDept: boolean;
  team: TeamMemberEntry[];
};

type FormData = {
  auditType: "INTERNAL" | "EXTERNAL";
  selectedYear: number | null;
  appointmentId: string;
  appointmentMembers: ApptMember[];
  selectedDeptIds: string[];
  selectedStandards: string[];
  file: File | null;
  deptSchedules: DeptScheduleEntry[];
  emailGroupTo: string[];
  emailGroupCc: string[];
  reviewerAuthUserId: string;
  reviewerEmail: string;
  reviewerName: string;
  approverAuthUserId: string;
  approverEmail: string;
  approverName: string;
  signaturePath: string;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  appointments: Appointment[];
  dbStandards: DbStandard[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

const ROLE_LABELS: Record<TeamMemberEntry["role"], string> = {
  LEAD_AUDITOR: "หัวผู้ตรวจสอบ",
  AUDITOR: "ผู้ตรวจสอบ",
  OBSERVER: "ผู้สังเกตการณ์",
  AUDITEE: "ผู้รับการตรวจ",
};

const ROLE_COLORS: Record<TeamMemberEntry["role"], string> = {
  LEAD_AUDITOR: "bg-indigo-100 text-indigo-700 border-indigo-200",
  AUDITOR: "bg-blue-100 text-blue-700 border-blue-200",
  OBSERVER: "bg-amber-100 text-amber-700 border-amber-200",
  AUDITEE: "bg-teal-100 text-teal-700 border-teal-200",
};

// ─── PersonSearch ─────────────────────────────────────────────────────────────

function PersonSearch({
  placeholder,
  onSelect,
  exclude,
}: {
  placeholder: string;
  onSelect: (c: ReviewerCandidate) => void;
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: candidates = [], isLoading } = useReviewerCandidates(q, q.length >= 1);
  const filtered = candidates.filter((c) => !exclude?.includes(c.id));

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, "pl-8")}
        />
      </div>
      {open && q.length >= 1 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-slate-400">กำลังค้นหา...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">ไม่พบผู้ใช้</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onSelect(c); setQ(""); setOpen(false); }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400">{c.email ?? ""}{c.department ? ` • ${c.department}` : ""}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── StandardCustomInput ──────────────────────────────────────────────────────

function StandardCustomInput({ selected, onAdd }: { selected: string[]; onAdd: (s: string) => void }) {
  const [val, setVal] = useState("");
  function add() {
    const t = val.trim();
    if (t && !selected.includes(t)) { onAdd(t); setVal(""); }
  }
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="เพิ่มมาตรฐานอื่น..."
        className={INPUT_CLASS}
      />
      <button type="button" onClick={add} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgb(0,0,0,0.04)] p-6 space-y-5">
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditPlanCreatePage({ appointments, dbStandards }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: emailGroupsRaw = [] } = useEmailGroups();
  const emailGroups = emailGroupsRaw.filter((g) => !!g.mail) as { id: string; displayName: string; mail: string }[];

  // Derive available years from appointments
  const availableYears = [...new Set(appointments.map((a) => a.year))].sort((a, b) => b - a);
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const defaultYear = availableYears.includes(currentBuddhistYear)
    ? currentBuddhistYear
    : (availableYears[0] ?? currentBuddhistYear);

  const [form, setForm] = useState<FormData>({
    auditType: "INTERNAL",
    selectedYear: defaultYear,
    appointmentId: "",
    appointmentMembers: [],
    selectedDeptIds: [],
    selectedStandards: [],
    file: null,
    deptSchedules: [],
    emailGroupTo: [],
    emailGroupCc: [],
    reviewerAuthUserId: "",
    reviewerEmail: "",
    reviewerName: "",
    approverAuthUserId: "",
    approverEmail: "",
    approverName: "",
    signaturePath: "",
  });

  function patch(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  // Filtered appointments based on year only (appointments don't have auditType)
  const filteredAppointments = appointments.filter((a) => a.year === form.selectedYear);

  function computeTitle() {
    return departments
      .filter((d) => form.selectedDeptIds.includes(d.id))
      .map((d) => d.name)
      .join(", ");
  }

  function handleDeptToggle(deptId: string, checked: boolean) {
    const deptName = departments.find((d) => d.id === deptId)?.name ?? deptId;
    const newIds = checked
      ? [...form.selectedDeptIds, deptId]
      : form.selectedDeptIds.filter((id) => id !== deptId);

    const existingIds = new Set(form.deptSchedules.map((d) => d.departmentId));
    const newSchedules = checked && !existingIds.has(deptId)
      ? [...form.deptSchedules, {
          departmentId: deptId,
          departmentName: deptName,
          enabled: false,
          startAt: "",
          endAt: "",
          location: "",
          contactEmail: "",
          auditeeNotifyDept: true,
          team: [],
        }]
      : form.deptSchedules.filter((d) => d.departmentId !== deptId || newIds.includes(deptId));

    patch({ selectedDeptIds: newIds, deptSchedules: newSchedules });
  }

  function patchDs(i: number, updates: Partial<DeptScheduleEntry>) {
    patch({ deptSchedules: form.deptSchedules.map((x, j) => j === i ? { ...x, ...updates } : x) });
  }

  function addTeamMember(i: number, member: Omit<TeamMemberEntry, "role">, role: TeamMemberEntry["role"]) {
    const ds = form.deptSchedules[i];
    if (ds.team.some((m) => m.authUserId === member.authUserId && m.role === role)) return;
    patchDs(i, { team: [...ds.team, { ...member, role }] });
  }

  function removeTeamMember(i: number, authUserId: string, role: TeamMemberEntry["role"]) {
    patchDs(i, { team: form.deptSchedules[i].team.filter((m) => !(m.authUserId === authUserId && m.role === role)) });
  }

  async function handleSubmit() {
    if (form.selectedDeptIds.length === 0) { toast.error("กรุณาเลือกอย่างน้อย 1 แผนก"); return; }
    if (!form.reviewerAuthUserId) { toast.error("กรุณาเลือก Reviewer"); return; }
    if (!form.approverAuthUserId) { toast.error("กรุณาเลือก Approver"); return; }
    if (!form.signaturePath) { setShowSignature(true); return; }

    setIsSubmitting(true);
    try {
      // 1. Create plan
      const planRes = await fetch("/api/audit/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: computeTitle(),
          auditType: form.auditType,
          mode: "FILE_UPLOAD",
          standards: form.selectedStandards,
          appointmentId: form.appointmentId || undefined,
        }),
      });
      const planJson = await planRes.json() as { data?: { id: string; auditNo: string }; message?: string };
      if (!planRes.ok) throw new Error(planJson.message ?? "สร้างแผนไม่สำเร็จ");
      const plan = planJson.data!;

      // 2. Departments
      const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
      await fetch(`/api/audit/plans/${plan.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: form.selectedDeptIds.map((id) => ({ departmentId: id, departmentName: deptMap[id] ?? "" })),
        }),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "ตั้งค่าแผนกไม่สำเร็จ"); });

      // 3. File upload
      if (form.file) {
        const fd = new FormData();
        fd.append("file", form.file);
        fd.append("planId", plan.id);
        fd.append("resourceType", "PLAN");
        fd.append("resourceId", plan.id);
        await fetch("/api/audit/attachments/upload", { method: "POST", body: fd })
          .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "อัปโหลดไฟล์ไม่สำเร็จ"); });
      }

      // 4. Schedules per dept
      for (const ds of form.deptSchedules) {
        if (!ds.enabled || !ds.startAt || !ds.endAt) continue;
        const lead = ds.team.find((m) => m.role === "LEAD_AUDITOR");
        await fetch(`/api/audit/plans/${plan.id}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionTitle: ds.departmentName,
            startAt: ds.startAt,
            endAt: ds.endAt,
            departmentId: ds.departmentId,
            departmentName: ds.departmentName,
            contactEmail: ds.contactEmail || undefined,
            location: ds.location || undefined,
            leadAuditorAuthUserId: lead?.authUserId,
            leadAuditorNameSnapshot: lead?.name,
            auditeeNotifyDept: ds.auditeeNotifyDept,
            team: ds.team.map((m) => ({ authUserId: m.authUserId, nameSnapshot: m.name, emailSnapshot: m.email ?? undefined, role: m.role })),
          }),
        }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `สร้างตาราง ${ds.departmentName} ไม่สำเร็จ`); });
      }

      // 5. Submit (signature + reviewer/approver)
      await fetch(`/api/audit/plans/${plan.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedRole: "PREPARER",
          signaturePath: form.signaturePath || undefined,
          reviewerAuthUserId: form.reviewerAuthUserId,
          reviewerEmail: form.reviewerEmail,
          reviewerNameSnapshot: form.reviewerName || undefined,
          approverAuthUserId: form.approverAuthUserId,
          approverEmail: form.approverEmail,
          approverNameSnapshot: form.approverName || undefined,
          emailGroupMails: [...form.emailGroupTo, ...form.emailGroupCc],
        }),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "ส่งแผนไม่สำเร็จ"); });

      toast.success(`สร้างแผน ${plan.auditNo} และส่งเพื่ออนุมัติแล้ว`);
      router.push(`/audit/plans/${plan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", { duration: Infinity });
      setIsSubmitting(false);
    }
  }

  if (showSignature) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <button
          type="button"
          onClick={() => setShowSignature(false)}
          className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> กลับไปแก้ไขฟอร์ม
        </button>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-1">ลงลายมือชื่อผู้จัดทำ</h2>
          <p className="text-sm text-slate-400 mb-5">กรุณาลงลายมือชื่อเพื่อยืนยันการสร้างแผนการตรวจสอบ</p>
          <SignaturePad
            onConfirm={(dataUrl) => {
              patch({ signaturePath: dataUrl });
              setShowSignature(false);
            }}
            onCancel={() => setShowSignature(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/audit/plans" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ChevronLeft className="h-4 w-4" /> แผนการตรวจสอบ
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">สร้างแผนการตรวจสอบใหม่</h1>
        <p className="text-sm text-slate-500 mt-0.5">Create New Audit Plan</p>
      </div>

      {/* ── Section 1: Year + Type → Appointment ── */}
      <SectionCard title="ข้อมูลพื้นฐาน">
        {/* Year selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            ปีการตรวจสอบ
          </label>
          <div className="flex flex-wrap gap-2">
            {availableYears.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่มีข้อมูลปีจาก Appointment</p>
            ) : (
              availableYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => patch({ selectedYear: y, appointmentId: "", appointmentMembers: [] })}
                  className={cn(
                    "rounded-xl border px-4 py-1.5 text-sm font-semibold transition-colors",
                    form.selectedYear === y
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 text-slate-600 hover:border-primary/60 hover:text-primary"
                  )}
                >
                  ปี {y} ({y - 543})
                </button>
              ))
            )}
          </div>
        </div>

        {/* Audit type */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            ประเภทการตรวจสอบ
          </label>
          <div className="flex gap-6">
            {(["INTERNAL", "EXTERNAL"] as const).map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="auditType"
                  value={type}
                  checked={form.auditType === type}
                  onChange={() => patch({ auditType: type, appointmentId: "", appointmentMembers: [] })}
                  className="h-4 w-4 border-slate-300 text-primary"
                />
                <span className="text-sm text-slate-700">
                  {type === "INTERNAL" ? "ตรวจสอบภายใน" : "ตรวจสอบภายนอก"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Appointment picker — filtered by year + type */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            ผังการแต่งตั้งผู้ตรวจสอบ{" "}
            <span className="text-slate-400 font-normal normal-case">(เลือกได้ — จะใช้ทีมจากผังนี้)</span>
          </label>
          {filteredAppointments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
              ไม่มี Appointment ที่ PUBLISHED สำหรับปี {form.selectedYear} ประเภท{form.auditType === "INTERNAL" ? "ภายใน" : "ภายนอก"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAppointments.map((a) => {
                const selected = form.appointmentId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      patch({
                        appointmentId: selected ? "" : a.id,
                        appointmentMembers: selected ? [] : a.members,
                        selectedStandards: selected ? form.selectedStandards : a.standards,
                      })
                    }
                    className={cn(
                      "w-full text-left rounded-xl border px-4 py-3 transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/5"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected ? "border-primary bg-primary" : "border-slate-300"
                      )}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{a.appointmentNo}</span>
                          <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">ปี {a.year}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{a.members.length} สมาชิก</p>
                      </div>
                      {a.standards.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end max-w-36">
                          {a.standards.map((s) => (
                            <span key={s} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded px-1.5 py-0.5">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Section 2: Departments ── */}
      <SectionCard title="แผนกที่ตรวจ *">
        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
          {deptsLoading ? (
            <div className="px-3 py-4 text-sm text-slate-400">กำลังโหลด...</div>
          ) : (
            departments.map((dept) => (
              <label key={dept.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.selectedDeptIds.includes(dept.id)}
                  onChange={(e) => handleDeptToggle(dept.id, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                />
                <span className="text-sm text-slate-700">{dept.name}</span>
              </label>
            ))
          )}
        </div>
        {form.selectedDeptIds.length > 0 && (
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-400">ชื่อแผน (auto-computed)</p>
            <p className="text-sm font-medium text-slate-700">{computeTitle()}</p>
          </div>
        )}
      </SectionCard>

      {/* ── Section 3: Standards + File ── */}
      <SectionCard title="มาตรฐานและไฟล์แนบ">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">มาตรฐาน ISO</label>
          {dbStandards.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {dbStandards.map((s) => {
                const sel = form.selectedStandards.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      patch({
                        selectedStandards: sel
                          ? form.selectedStandards.filter((x) => x !== s.name)
                          : [...form.selectedStandards, s.name],
                      })
                    }
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      sel
                        ? "bg-primary text-white border-primary"
                        : "border-slate-200 text-slate-600 hover:border-primary/60 hover:text-primary"
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
          <StandardCustomInput
            selected={form.selectedStandards}
            onAdd={(s) => {
              if (!form.selectedStandards.includes(s)) patch({ selectedStandards: [...form.selectedStandards, s] });
            }}
          />
          {form.selectedStandards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.selectedStandards.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {s}
                  <button type="button" onClick={() => patch({ selectedStandards: form.selectedStandards.filter((x) => x !== s) })} className="ml-0.5 text-blue-400 hover:text-blue-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">ไฟล์แนบแผน</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => patch({ file: e.target.files?.[0] ?? null })}
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              เลือกไฟล์
            </Button>
            {form.file ? (
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                {form.file.name}
                <button type="button" onClick={() => { patch({ file: null }); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-slate-400 hover:text-rose-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span className="text-sm text-slate-400">ยังไม่ได้เลือกไฟล์</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">รองรับ PDF, Word, Excel, PNG, JPEG ขนาดไม่เกิน 20 MB</p>
        </div>
      </SectionCard>

      {/* ── Section 4: Schedule per dept ── */}
      {form.deptSchedules.length > 0 && (
        <SectionCard title={form.auditType === "INTERNAL" ? "ตารางและทีมตรวจสอบ" : "ตารางการตรวจสอบ"}>
          <p className="text-sm text-slate-500 -mt-2">
            {form.auditType === "INTERNAL"
              ? "กำหนดวันและทีมสำหรับแต่ละแผนก (ข้ามได้ เพิ่มทีหลังใน Detail)"
              : "กำหนดวันตรวจสอบสำหรับแต่ละแผนก (ข้ามได้ เพิ่มทีหลังใน Detail)"}
          </p>
          <div className="space-y-4">
            {form.deptSchedules.map((ds, i) => {
              const apptCandidates = form.appointmentMembers;
              const lead = ds.team.filter((m) => m.role === "LEAD_AUDITOR");
              const auditors = ds.team.filter((m) => m.role === "AUDITOR");
              const observers = ds.team.filter((m) => m.role === "OBSERVER");
              const auditees = ds.team.filter((m) => m.role === "AUDITEE");

              return (
                <div key={ds.departmentId} className={cn("rounded-xl border p-4 space-y-4 transition-colors", ds.enabled ? "border-violet-200 bg-violet-50/30" : "border-slate-100 bg-white")}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ds.enabled}
                      onChange={(e) => patchDs(i, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    <span className="font-semibold text-slate-800">{ds.departmentName}</span>
                  </label>

                  {ds.enabled && (
                    <div className="space-y-4 pl-7">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">วันเริ่มตรวจ <span className="text-rose-500">*</span></label>
                          <input type="datetime-local" value={ds.startAt} onChange={(e) => patchDs(i, { startAt: e.target.value })} className={INPUT_CLASS} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">วันสิ้นสุด <span className="text-rose-500">*</span></label>
                          <input type="datetime-local" value={ds.endAt} onChange={(e) => patchDs(i, { endAt: e.target.value })} className={INPUT_CLASS} />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">อีเมลติดต่อแผนก</label>
                          <input type="email" value={ds.contactEmail} onChange={(e) => patchDs(i, { contactEmail: e.target.value })} placeholder="dept@company.com" className={INPUT_CLASS} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">สถานที่</label>
                          <input type="text" value={ds.location} onChange={(e) => patchDs(i, { location: e.target.value })} className={INPUT_CLASS} />
                        </div>
                      </div>

                      {/* Team roles — Internal only */}
                      {form.auditType === "INTERNAL" && (["LEAD_AUDITOR", "AUDITOR", "OBSERVER"] as const).map((role) => {
                        const members = role === "LEAD_AUDITOR" ? lead : role === "AUDITOR" ? auditors : observers;
                        const useApptPicker = apptCandidates.length > 0 && role !== "OBSERVER";
                        return (
                          <div key={role}>
                            <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS[role]}</p>
                            {useApptPicker ? (
                              <select
                                value=""
                                onChange={(e) => {
                                  const m = apptCandidates.find((c) => c.authUserId === e.target.value);
                                  if (m) addTeamMember(i, { authUserId: m.authUserId, name: m.name, email: null }, role);
                                }}
                                className={INPUT_CLASS}
                              >
                                <option value="">-- เลือกจากผังการแต่งตั้ง --</option>
                                {apptCandidates
                                  .filter((c) => !members.some((m) => m.authUserId === c.authUserId))
                                  .map((c) => <option key={c.authUserId} value={c.authUserId}>{c.name}</option>)}
                              </select>
                            ) : (
                              <PersonSearch
                                placeholder={`ค้นหา${ROLE_LABELS[role]}...`}
                                onSelect={(c) => addTeamMember(i, { authUserId: c.id, name: c.name, email: c.email }, role)}
                                exclude={members.map((m) => m.authUserId)}
                              />
                            )}
                            {members.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {members.map((m) => (
                                  <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS[role])}>
                                    {m.name}
                                    <button type="button" onClick={() => removeTeamMember(i, m.authUserId, role)} className="ml-0.5 opacity-60 hover:opacity-100">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Auditee — Internal only */}
                      {form.auditType === "INTERNAL" && <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS.AUDITEE}</p>
                        <div className="flex items-center gap-4 mb-2">
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" checked={ds.auditeeNotifyDept} onChange={() => patchDs(i, { auditeeNotifyDept: true, team: ds.team.filter((m) => m.role !== "AUDITEE") })} className="h-4 w-4 border-slate-300 text-primary" />
                            ส่งทั้งแผนก
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" checked={!ds.auditeeNotifyDept} onChange={() => patchDs(i, { auditeeNotifyDept: false })} className="h-4 w-4 border-slate-300 text-primary" />
                            เลือกรายคน
                          </label>
                        </div>
                        {ds.auditeeNotifyDept ? (
                          <p className="text-xs text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">จะส่งถึงทุกคนในแผนก {ds.departmentName}</p>
                        ) : (
                          <>
                            <PersonSearch
                              placeholder="ค้นหาผู้รับการตรวจ..."
                              onSelect={(c) => addTeamMember(i, { authUserId: c.id, name: c.name, email: c.email }, "AUDITEE")}
                              exclude={auditees.map((m) => m.authUserId)}
                            />
                            {auditees.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {auditees.map((m) => (
                                  <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS.AUDITEE)}>
                                    {m.name}
                                    <button type="button" onClick={() => removeTeamMember(i, m.authUserId, "AUDITEE")} className="ml-0.5 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Section 5: Email groups ── */}
      {emailGroups.length > 0 && (
        <SectionCard title="กลุ่มรับอีเมล">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 -mt-2">
            อีเมลจะถูกส่งหลังจาก <strong>Reviewer</strong> และ <strong>Approver</strong> อนุมัติครบเท่านั้น
          </p>
          {(["To", "CC"] as const).map((label) => {
            const selected = label === "To" ? form.emailGroupTo : form.emailGroupCc;
            function toggle(mail: string, checked: boolean) {
              if (label === "To") {
                patch({ emailGroupTo: checked ? [...form.emailGroupTo, mail] : form.emailGroupTo.filter((m) => m !== mail) });
              } else {
                patch({ emailGroupCc: checked ? [...form.emailGroupCc, mail] : form.emailGroupCc.filter((m) => m !== mail) });
              }
            }
            return (
              <div key={label}>
                <p className="mb-2 text-xs font-semibold text-slate-500">{label === "To" ? "To — ส่งถึง" : "CC — สำเนาถึง"}</p>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {emailGroups.map((g) => {
                    const checked = selected.includes(g.mail);
                    return (
                      <label key={g.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors", checked ? "bg-primary/5" : "hover:bg-slate-50")}>
                        <input type="checkbox" checked={checked} onChange={(e) => toggle(g.mail, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary" />
                        <div className="min-w-0">
                          <p className={cn("text-sm", checked ? "font-semibold text-slate-800" : "font-medium text-slate-700")}>{g.displayName}</p>
                          <p className="text-[11px] text-slate-400">{g.mail.split("@")[0]}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </SectionCard>
      )}

      {/* ── Section 6: Reviewer + Approver ── */}
      <SectionCard title="ผู้อนุมัติ">
        {(["reviewer", "approver"] as const).map((type) => {
          const isReviewer = type === "reviewer";
          const name = isReviewer ? form.reviewerName : form.approverName;
          const email = isReviewer ? form.reviewerEmail : form.approverEmail;
          const id = isReviewer ? form.reviewerAuthUserId : form.approverAuthUserId;
          const color = isReviewer ? "violet" : "fuchsia";
          return (
            <div key={type}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isReviewer ? "Reviewer" : "Approver"} <span className="text-rose-500">*</span>
              </label>
              <PersonSearch
                placeholder={`ค้นหา ${isReviewer ? "Reviewer" : "Approver"}...`}
                onSelect={(c) =>
                  isReviewer
                    ? patch({ reviewerAuthUserId: c.id, reviewerEmail: c.email ?? "", reviewerName: c.name })
                    : patch({ approverAuthUserId: c.id, approverEmail: c.email ?? "", approverName: c.name })
                }
              />
              {id && (
                <div className={`mt-2 flex items-center gap-2 rounded-xl border border-${color}-200 bg-${color}-50 px-3 py-2`}>
                  <div className="flex-1">
                    <p className={`text-sm font-medium text-${color}-800`}>{name}</p>
                    <p className={`text-xs text-${color}-500`}>{email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isReviewer
                        ? patch({ reviewerAuthUserId: "", reviewerEmail: "", reviewerName: "" })
                        : patch({ approverAuthUserId: "", approverEmail: "", approverName: "" })
                    }
                    className={`text-${color}-400 hover:text-${color}-600`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </SectionCard>

      {/* ── Signature status + Submit ── */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white shadow-sm px-6 py-4">
        <div>
          {form.signaturePath ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-700 font-medium">ลงลายมือชื่อแล้ว</span>
              <button type="button" onClick={() => setShowSignature(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">เปลี่ยน</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowSignature(true)} className="text-sm text-primary hover:underline font-medium">
              ลงลายมือชื่อผู้จัดทำ (จำเป็น)
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/audit/plans">ยกเลิก</Link>
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกและส่งอนุมัติ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
