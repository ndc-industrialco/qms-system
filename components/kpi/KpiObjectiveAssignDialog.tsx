"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface KpiWorkflowAssignee { id: string; name: string | null; email: string; role: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: KpiWorkflowAssignee[];
  initialReviewerId?: string;
  initialApproverId?: string;
  onConfirm: (reviewerUserId: string, approverUserId: string) => Promise<void>;
}

export default function KpiObjectiveAssignDialog({
  open,
  onOpenChange,
  assignees,
  initialReviewerId,
  initialApproverId,
  onConfirm,
}: Props) {
  const t = useT();
  const [reviewerUserId, setReviewerUserId] = useState(initialReviewerId ?? "");
  const [approverUserId, setApproverUserId] = useState(initialApproverId ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reviewerUserId || !approverUserId) return;
    setSaving(true);
    try {
      await onConfirm(reviewerUserId, approverUserId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("kpi.reference.table.department")} Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-600 mb-1">Reviewer</p>
            <Select value={reviewerUserId} onValueChange={setReviewerUserId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select reviewer" /></SelectTrigger>
              <SelectContent>
                {assignees.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Approver</p>
            <Select value={approverUserId} onValueChange={setApproverUserId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select approver" /></SelectTrigger>
              <SelectContent>
                {assignees.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button className="rounded-xl bg-[rgb(15,16,89)] hover:bg-[#161875]" onClick={submit} disabled={saving || !reviewerUserId || !approverUserId}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
