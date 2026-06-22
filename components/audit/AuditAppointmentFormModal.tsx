"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import GraphUserPicker, { type GraphUserResult } from "@/components/shared/GraphUserPicker";
import { auditAppointmentCreateSchema, type AuditAppointmentCreateInput } from "@/lib/validations/audit";
import { useCreateAuditAppointment } from "@/hooks/api/use-audit-appointments";
import { useAuditStandards } from "@/hooks/api/use-audit-standards";

type FormValues = AuditAppointmentCreateInput;

const MEMBER_ROLES = [
  { value: "LEAD_AUDITOR", label: "หัวหน้าทีมผู้ตรวจ (Lead Auditor)" },
  { value: "AUDITOR", label: "ผู้ตรวจติดตาม (Internal Auditor)" },
  { value: "COMMITTEE", label: "คณะทำงาน (Working Committee)" },
  { value: "SECRETARY", label: "เลขานุการ (Secretary)" },
  { value: "ADVISOR", label: "ที่ปรึกษา (Advisor)" },
];

const STEPS = [
  { label: "ข้อมูลทั่วไป", sublabel: "General Info" },
  { label: "สมาชิก", sublabel: "Members" },
  { label: "รายชื่ออีเมล", sublabel: "Email Groups" },
  { label: "ผู้ตรวจสอบ/อนุมัติ", sublabel: "Reviewer & Approver" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AuditAppointmentFormModal({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState(0);
  const [standardInput, setStandardInput] = useState("");
  const { data: dbStandards = [] } = useAuditStandards();
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<GraphUserResult | null>(null);
  const [approver, setApprover] = useState<GraphUserResult | null>(null);
  const [memberUsers, setMemberUsers] = useState<(GraphUserResult | null)[]>([]);
  const createMutation = useCreateAuditAppointment();

  const currentYear = new Date().getFullYear() + 543; // Convert to Buddhist Era

  const form = useForm<FormValues>({
    resolver: zodResolver(auditAppointmentCreateSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      year: currentYear,
      title: "",
      standards: [],
      members: [],
      reviewerAuthUserId: "",
      reviewerEmail: "",
      reviewerNameSnapshot: "",
      approverAuthUserId: "",
      approverEmail: "",
      approverNameSnapshot: "",
      emailGroupMails: [],
    },
  });

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: "members",
  });

  const standards = form.watch("standards");
  const emailGroupMails = form.watch("emailGroupMails");

  function addStandard(s: string) {
    const trimmed = s.trim();
    if (!trimmed || standards.includes(trimmed)) return;
    form.setValue("standards", [...standards, trimmed]);
    setStandardInput("");
  }

  function removeStandard(s: string) {
    form.setValue("standards", standards.filter((x) => x !== s));
  }

  function addEmail(e: string) {
    const trimmed = e.trim();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("กรุณาระบุอีเมลที่ถูกต้อง (Please enter a valid email)");
      return;
    }
    setEmailError(null);
    if (emailGroupMails.includes(trimmed)) return;
    form.setValue("emailGroupMails", [...emailGroupMails, trimmed]);
    setEmailInput("");
  }

  function removeEmail(e: string) {
    form.setValue("emailGroupMails", emailGroupMails.filter((x) => x !== e));
  }

  function addMember() {
    appendMember({
      authUserId: "",
      name: "",
      department: "",
      role: "AUDITOR",
      standards: [],
      orderIndex: memberFields.length,
    });
    setMemberUsers((prev) => [...prev, null]);
  }

  function removeMemberWithUser(index: number) {
    removeMember(index);
    setMemberUsers((prev) => prev.filter((_, i) => i !== index));
  }

  function pickMemberUser(index: number, user: GraphUserResult | null) {
    setMemberUsers((prev) => prev.map((u, i) => i === index ? user : u));
    if (user) {
      form.setValue(`members.${index}.authUserId`, user.id);
      form.setValue(`members.${index}.name`, user.name);
      form.setValue(`members.${index}.department`, user.department ?? "");
    } else {
      form.setValue(`members.${index}.authUserId`, "");
      form.setValue(`members.${index}.name`, "");
      form.setValue(`members.${index}.department`, "");
    }
  }

  async function handleNext() {
    // Trigger validation for current step fields
    let valid = true;
    if (step === 0) {
      valid = await form.trigger(["year", "title", "standards"]);
    } else if (step === 1) {
      valid = await form.trigger(["members"]);
    } else if (step === 3) {
      // Set reviewer/approver from pickers
      if (!reviewer || !approver) {
        toast.error("กรุณาเลือกผู้ตรวจสอบและผู้อนุมัติ");
        return;
      }
      form.setValue("reviewerAuthUserId", reviewer.id);
      form.setValue("reviewerEmail", reviewer.email);
      form.setValue("reviewerNameSnapshot", reviewer.name);
      form.setValue("approverAuthUserId", approver.id);
      form.setValue("approverEmail", approver.email);
      form.setValue("approverNameSnapshot", approver.name);
      valid = await form.trigger(["reviewerAuthUserId", "reviewerEmail", "approverAuthUserId", "approverEmail"]);
    }
    if (!valid) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!reviewer || !approver) {
      toast.error("กรุณาเลือกผู้ตรวจสอบและผู้อนุมัติ");
      return;
    }
    const values = form.getValues();
    values.reviewerAuthUserId = reviewer.id;
    values.reviewerEmail = reviewer.email;
    values.reviewerNameSnapshot = reviewer.name;
    values.approverAuthUserId = approver.id;
    values.approverEmail = approver.email;
    values.approverNameSnapshot = approver.name;

    try {
      await createMutation.mutateAsync(values);
      toast.success("สร้างประกาศแต่งตั้งเรียบร้อยแล้ว");
      onOpenChange(false);
      onSuccess?.();
      form.reset();
      setStep(0);
      setReviewer(null);
      setApprover(null);
      setMemberUsers([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setStep(0);
    setReviewer(null);
    setApprover(null);
    setMemberUsers([]);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            สร้างประกาศแต่งตั้งผู้ตรวจติดตามภายใน
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-400"
              }`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-slate-800" : "text-slate-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-slate-200 shrink-0 ml-1" />}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Step 0: General Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="year">ปี (พ.ศ.) <span className="text-red-500">*</span></Label>
                  <Input
                    id="year"
                    type="number"
                    min={2560}
                    max={2999}
                    {...form.register("year", { valueAsNumber: true })}
                    className="rounded-xl"
                  />
                  {form.formState.errors.year && (
                    <p className="text-xs text-red-500">{form.formState.errors.year.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">ชื่อประกาศ <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="ประกาศแต่งตั้งผู้ตรวจติดตามภายใน ประจำปี..."
                  className="rounded-xl"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>มาตรฐาน ISO</Label>
                {dbStandards.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {dbStandards.filter((s) => s.active).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addStandard(s.name)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          standards.includes(s.name)
                            ? "bg-primary text-white border-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={standardInput}
                    onChange={(e) => setStandardInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStandard(standardInput); } }}
                    placeholder="เพิ่มมาตรฐานอื่น..."
                    className="rounded-xl flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => addStandard(standardInput)} className="rounded-xl shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {standards.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {standards.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {s}
                        <button type="button" onClick={() => removeStandard(s)} className="ml-0.5 text-blue-400 hover:text-blue-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Members */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">รายชื่อสมาชิก ({memberFields.length} คน)</p>
                <Button type="button" variant="outline" size="sm" onClick={addMember} className="rounded-lg">
                  <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มสมาชิก
                </Button>
              </div>
              {memberFields.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                  กดปุ่ม &ldquo;เพิ่มสมาชิก&rdquo; เพื่อเพิ่มรายชื่อ
                </div>
              )}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {memberFields.map((field, index) => (
                  <div key={field.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">สมาชิกที่ {index + 1}</span>
                      <button type="button" onClick={() => removeMemberWithUser(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <GraphUserPicker
                      label="ชื่อ-สกุล"
                      value={memberUsers[index] ?? null}
                      onChange={(u) => pickMemberUser(index, u)}
                      placeholder="ค้นหาชื่อพนักงาน..."
                      required
                    />
                    {form.formState.errors.members?.[index]?.authUserId && (
                      <p className="text-xs text-red-500">กรุณาเลือกพนักงาน</p>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">บทบาท <span className="text-red-500">*</span></Label>
                      <Select
                        value={form.watch(`members.${index}.role`)}
                        onValueChange={(v) => form.setValue(`members.${index}.role`, v)}
                      >
                        <SelectTrigger className="rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBER_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Email Groups */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                เพิ่มอีเมลที่ต้องการส่งประกาศเมื่อได้รับการอนุมัติ
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(emailInput); } }}
                  placeholder="email@company.com"
                  className="rounded-xl flex-1"
                />
                <Button type="button" variant="outline" onClick={() => addEmail(emailInput)} className="rounded-xl shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
              {emailGroupMails.length > 0 ? (
                <div className="space-y-1.5">
                  {emailGroupMails.map((email) => (
                    <div key={email} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{email}</span>
                      <button type="button" onClick={() => removeEmail(email)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">ยังไม่มีอีเมล (ไม่บังคับ)</p>
              )}
            </div>
          )}

          {/* Step 3: Reviewer & Approver */}
          {step === 3 && (
            <div className="space-y-4">
              <GraphUserPicker
                label="ผู้ตรวจสอบ (Reviewer)"
                value={reviewer}
                onChange={setReviewer}
                placeholder="ค้นหาผู้ตรวจสอบ..."
                required
              />
              <GraphUserPicker
                label="ผู้อนุมัติ (Approver)"
                value={approver}
                onChange={setApprover}
                placeholder="ค้นหาผู้อนุมัติ..."
                required
              />
              {reviewer && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                  <p className="font-medium text-emerald-800">Reviewer: {reviewer.name}</p>
                  <p className="text-emerald-600 text-xs">{reviewer.email}</p>
                </div>
              )}
              {approver && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm">
                  <p className="font-medium text-violet-800">Approver: {approver.name}</p>
                  <p className="text-violet-600 text-xs">{approver.email}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => step === 0 ? handleClose() : setStep(step - 1)}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "ยกเลิก" : "ย้อนกลับ"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{step + 1} / {STEPS.length}</span>
            <Button
              type="button"
              onClick={handleNext}
              disabled={createMutation.isPending}
              className="rounded-xl bg-primary hover:bg-[#161875]"
            >
              {step === STEPS.length - 1 ? (
                createMutation.isPending ? "กำลังสร้าง..." : "สร้างประกาศ"
              ) : (
                <>ถัดไป <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
