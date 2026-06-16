"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";

type ConfigUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  department: { id: string; name: string } | null;
};

type Props = {
  users: ConfigUser[];
  currentMrUserId: string | null;
  currentQmsUserId: string | null;
};

function labelOf(user: ConfigUser) {
  const base = user.name?.trim() || user.email || user.id;
  const dept = user.department?.name ? ` - ${user.department.name}` : "";
  return `${base} (${user.role})${dept}`;
}

export default function ApprovalConfigClient({ users, currentMrUserId, currentQmsUserId }: Props) {
  const t = useT();
  const router = useRouter();

  const [mrUserId, setMrUserId] = useState<string>(currentMrUserId ?? "");
  const [qmsUserId, setQmsUserId] = useState<string>(currentQmsUserId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => labelOf(a).localeCompare(labelOf(b))), [users]);

  async function onSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/qms/approval-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrUserId: mrUserId || null, qmsUserId: qmsUserId || null }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        const msg = typeof json?.error?.message === "string" ? json.error.message : t("qms.approval.saveFail");
        setError(msg);
        return;
      }
      setMessage(t("qms.approval.saveSuccess"));
      router.refresh();
    } catch {
      setError(t("qms.approval.connectionError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("qms.approval.title")}
        subtitle={t("qms.approval.subtitle")}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">
            {t("qms.approval.mrLabel")}
          </label>
          <select
            value={mrUserId}
            onChange={(e) => setMrUserId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("qms.approval.notSet")}</option>
            {sortedUsers.map((user) => (
              <option key={user.id} value={user.id}>{labelOf(user)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">
            {t("qms.approval.qmsLabel")}
          </label>
          <select
            value={qmsUserId}
            onChange={(e) => setQmsUserId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("qms.approval.notSet")}</option>
            {sortedUsers.map((user) => (
              <option key={user.id} value={user.id}>{labelOf(user)}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}

        <div className="pt-2">
          <Button onClick={onSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90">
            {saving ? t("qms.approval.savingLabel") : t("qms.approval.saveButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
