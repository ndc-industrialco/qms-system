"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, UserCheck, FileText, CheckSquare, Loader2 } from "lucide-react";

interface UserOption {
  id: string;
  authUserId: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface ConfigResponse {
  users: UserOption[];
  currentMrUserId: string | null;
  currentQmsUserId: string | null;
  darQmsUserId: string | null;
  carQmsUserId: string | null;
  currentMrEmail: string | null;
  currentQmsEmail: string | null;
  darQmsEmail: string | null;
  carQmsEmail: string | null;
}

export default function ApprovalConfigClient() {
  const queryClient = useQueryClient();

  const [mrUserId, setMrUserId] = useState<string>("");
  const [qmsUserId, setQmsUserId] = useState<string>("");
  const [darQmsUserId, setDarQmsUserId] = useState<string>("");
  const [carQmsUserId, setCarQmsUserId] = useState<string>("");

  const { data, isLoading, error } = useQuery<ConfigResponse>({
    queryKey: ["qms-approval-config"],
    queryFn: async () => {
      const res = await fetch("/api/qms/approval-config");
      if (!res.ok) {
        throw new Error("Failed to load approval configuration");
      }
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (data) {
      setMrUserId(data.currentMrUserId ?? "");
      setQmsUserId(data.currentQmsUserId ?? "");
      setDarQmsUserId(data.darQmsUserId ?? "");
      setCarQmsUserId(data.carQmsUserId ?? "");
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Find emails of selected users to send along with POST
      const selectedMr = data?.users.find((u) => u.authUserId === mrUserId);
      const selectedQms = data?.users.find((u) => u.authUserId === qmsUserId);
      const selectedDarQms = data?.users.find((u) => u.authUserId === darQmsUserId);
      const selectedCarQms = data?.users.find((u) => u.authUserId === carQmsUserId);

      const payload = {
        mrAuthUserId: mrUserId || null,
        qmsAuthUserId: qmsUserId || null,
        emails: {
          mrEmail: selectedMr?.email || null,
          qmsEmail: selectedQms?.email || null,
        },
        darQmsAuthUserId: darQmsUserId || null,
        carQmsAuthUserId: carQmsUserId || null,
        moduleEmails: {
          darQmsEmail: selectedDarQms?.email || null,
          carQmsEmail: selectedCarQms?.email || null,
        },
      };

      const res = await fetch("/api/qms/approval-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Failed to save configuration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-approval-config"] });
      toast.success("บันทึกการตั้งค่าผู้อนุมัติอัตโนมัติสำเร็จ", { duration: 3000 });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <Skeleton className="h-6 w-1/2 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {error?.message ?? "ไม่สามารถโหลดข้อมูลการตั้งค่าได้"}
      </div>
    );
  }

  // Filter users with specific roles to make selection clean
  const mrCandidates = data.users.filter((u) => u.role === "MR" || u.role === "QMS");
  const qmsCandidates = data.users.filter((u) => u.role === "QMS");

  // Fallback to all users if the role lists are empty
  const mrList = mrCandidates.length > 0 ? mrCandidates : data.users;
  const qmsList = qmsCandidates.length > 0 ? qmsCandidates : data.users;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าผู้อนุมัติอัตโนมัติ</h1>
        <p className="text-sm text-slate-500 mt-1">
          กำหนดผู้อนุมัติ MR และผู้ประมวลผล/ทวนสอบ QMS เริ่มต้นของแต่ละระบบ หากไม่มีการระบุผู้รับผิดชอบ ระบบจะส่งให้บุคคลที่เลือกไว้ที่นี่โดยอัตโนมัติ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MR Configuration Card */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F1059]/10 flex items-center justify-center text-[#0F1059] shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">ผู้อนุมัติ MR (Default MR)</CardTitle>
              <p className="text-xs text-slate-500">ผู้อนุมัติสูงสุดของ CAR และ DAR</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                เลือก MR สำหรับลงนามปิด CAR และอนุมัติ DAR
              </label>
              <select
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1059]/30 focus:border-[#0F1059]/60 transition-colors"
                value={mrUserId}
                onChange={(e) => setMrUserId(e.target.value)}
              >
                <option value="">-- ไม่กำหนด (ใช้ระบบค้นหาสิทธิ์ของ Auth Center) --</option>
                {mrList.map((u) => (
                  <option key={u.authUserId} value={u.authUserId}>
                    {u.name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* DAR QMS Processor Card */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F1059]/10 flex items-center justify-center text-[#0F1059] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">DAR: ผู้ประมวลผล QMS (Default QMS)</CardTitle>
              <p className="text-xs text-slate-500">ผู้รับผิดชอบการประมวลผลเอกสารของ DAR</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                เลือกเจ้าหน้าที่ QMS สำหรับขั้นตอน QMS Processing ใน DAR
              </label>
              <select
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1059]/30 focus:border-[#0F1059]/60 transition-colors"
                value={darQmsUserId}
                onChange={(e) => setDarQmsUserId(e.target.value)}
              >
                <option value="">-- ไม่กำหนด (ใช้ผู้ประมวลผล QMS เริ่มต้นของระบบ) --</option>
                {qmsList.map((u) => (
                  <option key={u.authUserId} value={u.authUserId}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* CAR QMS Verifier Card */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F1059]/10 flex items-center justify-center text-[#0F1059] shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">CAR: ผู้ทวนสอบ QMS (Default QMS Verifier)</CardTitle>
              <p className="text-xs text-slate-500">ผู้รับผิดชอบการทวนสอบปิดประเด็นของ CAR</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                เลือกเจ้าหน้าที่ QMS สำหรับขั้นตอน Verification ใน CAR
              </label>
              <select
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1059]/30 focus:border-[#0F1059]/60 transition-colors"
                value={carQmsUserId}
                onChange={(e) => setCarQmsUserId(e.target.value)}
              >
                <option value="">-- ไม่กำหนด (ใช้ผู้ทวนสอบ QMS เริ่มต้นของระบบ) --</option>
                {qmsList.map((u) => (
                  <option key={u.authUserId} value={u.authUserId}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* System Fallback QMS Card */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F1059]/10 flex items-center justify-center text-[#0F1059] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">QMS เริ่มต้นของระบบ (System Fallback QMS)</CardTitle>
              <p className="text-xs text-slate-500">เจ้าหน้าที่ QMS หลักของระบบ (Fallback)</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                เลือกเจ้าหน้าที่ QMS สำหรับขั้นตอนทั่วไปในระบบ
              </label>
              <select
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1059]/30 focus:border-[#0F1059]/60 transition-colors"
                value={qmsUserId}
                onChange={(e) => setQmsUserId(e.target.value)}
              >
                <option value="">-- ไม่กำหนด (ใช้สิทธิ์แรกของ Auth Center) --</option>
                {qmsList.map((u) => (
                  <option key={u.authUserId} value={u.authUserId}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-[#0F1059] hover:bg-[#161875] text-white px-6 py-2.5 h-11 rounded-xl font-semibold shadow-sm transition-all"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          บันทึกการตั้งค่า
        </Button>
      </div>
    </div>
  );
}
