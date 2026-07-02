"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, FileText, Loader2, Save } from "lucide-react";

interface FooterConfig {
  moduleKey: string;
  prefix: string;
  label: string;
}

export default function FooterConfigClient() {
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<FooterConfig[]>([]);

  const { data, isLoading, error } = useQuery<{ data: FooterConfig[] }>({
    queryKey: ["qms-footer-config"],
    queryFn: async () => {
      const res = await fetch("/api/qms/footer-config");
      if (!res.ok) {
        throw new Error("Failed to load footer configuration");
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      setConfigs(data.data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/qms/footer-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });
      if (!res.ok) {
        throw new Error("Failed to save configuration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-footer-config"] });
      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว", { duration: 3000 });
    },
    onError: (err: Error) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    },
  });

  const handleInputChange = (moduleKey: string, field: "prefix" | "label", value: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.moduleKey === moduleKey ? { ...c, [field]: value } : c))
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {error?.message || "ไม่สามารถโหลดข้อมูลการตั้งค่าได้"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-[#0F1059]" />
        <h1 className="text-xl font-bold text-slate-900">ตั้งค่าหัว/ท้ายเอกสาร</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((config) => (
          <Card key={config.moduleKey} className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <FileText className="w-5 h-5 text-[#0F1059]" />
              <CardTitle className="text-sm font-bold text-slate-900">
                {config.moduleKey}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Document Prefix</label>
                <input
                  type="text"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1059]/30 focus:border-[#0F1059]/60 transition-colors"
                  value={config.prefix}
                  onChange={(e) => handleInputChange(config.moduleKey, "prefix", e.target.value)}
                  placeholder="e.g. FM-QMS-01"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Document Name / Label</label>
                <input
                  type="text"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1059]/30 focus:border-[#0F1059]/60 transition-colors"
                  value={config.label}
                  onChange={(e) => handleInputChange(config.moduleKey, "label", e.target.value)}
                  placeholder="e.g. DAR Form"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-[#0F1059] hover:bg-[#161875] text-white px-5 py-2 h-10 rounded-lg font-semibold shadow-sm transition-all"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          บันทึกข้อมูล
        </Button>
      </div>
    </div>
  );
}
