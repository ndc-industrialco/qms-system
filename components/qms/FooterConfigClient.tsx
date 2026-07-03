"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Save, Settings } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface FooterConfig {
  moduleKey: string;
  prefix: string;
  label: string;
}

const MODULE_META: Record<string, { title: string; prefixPlaceholder: string; labelPlaceholder: string; usage: string }> = {
  DAR: {
    title: "DAR",
    prefixPlaceholder: "e.g. FM-DC-01",
    labelPlaceholder: "e.g. Document Action Request (DAR)",
    usage: "Used on DAR print and export surfaces that read the shared footer config.",
  },
  CAR: {
    title: "CAR",
    prefixPlaceholder: "e.g. FM-QMS-02",
    labelPlaceholder: "e.g. Corrective Action Request (CAR)",
    usage: "Used on CAR print and export surfaces that read the shared footer config.",
  },
  KPI_ANNUAL: {
    title: "KPI Annual",
    prefixPlaceholder: "e.g. FM-KPI-01",
    labelPlaceholder: "e.g. KPI Annual Objective",
    usage: "Used on annual KPI print and export surfaces that read the shared footer config.",
  },
  KPI_MONTHLY: {
    title: "KPI Monthly",
    prefixPlaceholder: "e.g. FM-KPI-02",
    labelPlaceholder: "e.g. KPI Monthly Report",
    usage: "Used on monthly KPI print and export surfaces that read the shared footer config.",
  },
  DOC_CONTROL: {
    title: "Document Control",
    prefixPlaceholder: "e.g. FM-DC-03",
    labelPlaceholder: "e.g. Document Control Master List",
    usage: "Used on Document Control print and export surfaces that read the shared footer config.",
  },
  AUDIT_APPT: {
    title: "Audit Appointment",
    prefixPlaceholder: "e.g. FM-IA-00",
    labelPlaceholder: "e.g. Audit Appointment Letter",
    usage: "Used on the Audit Appointment print footer and as the source for appointment export worksheet and file naming.",
  },
  AUDIT_PLAN: {
    title: "Audit Plan",
    prefixPlaceholder: "e.g. FM-IA-01",
    labelPlaceholder: "e.g. Internal Audit Plan",
    usage: "Used on Audit Plan print and export surfaces that read the shared footer config.",
  },
  AUDITOR: {
    title: "Auditor",
    prefixPlaceholder: "e.g. FM-IA-02",
    labelPlaceholder: "e.g. Auditor Approval Form",
    usage: "Used on auditor-facing print and export surfaces that read the shared footer config.",
  },
};

export default function FooterConfigClient() {
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<FooterConfig[]>([]);

  const { data, isLoading, error } = useQuery<{ data: FooterConfig[] }>({
    queryKey: ["qms-footer-config"],
    queryFn: async () => {
      const res = await fetch("/api/qms/footer-config");
      if (!res.ok) throw new Error("Failed to load footer configuration");
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
      if (!res.ok) throw new Error("Failed to save configuration");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-footer-config"] });
      toast.success("Saved footer configuration");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save footer configuration");
    },
  });

  const handleInputChange = (moduleKey: string, field: "prefix" | "label", value: string) => {
    setConfigs((prev) =>
      prev.map((config) => (config.moduleKey === moduleKey ? { ...config, [field]: value } : config)),
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {error instanceof Error ? error.message : "Unable to load footer configuration"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Footer & Export Naming Configuration"
        subtitle="QMS manages footer prefix, print label, worksheet naming, and export filename seeds from one central page."
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-slate-900">
          <Settings className="h-4 w-4 text-[#0F1059]" />
          <span className="font-semibold">Usage</span>
        </div>
        <p className="mt-2">
          `Document Prefix` is shown in the footer area of forms and exports. `Document Label` is the form name shown on print and PDF surfaces, and supported exports can also derive worksheet names and download filenames from the same values.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {configs.map((config) => {
          const meta = MODULE_META[config.moduleKey] ?? {
            title: config.moduleKey,
            prefixPlaceholder: "e.g. FM-QMS-01",
            labelPlaceholder: "e.g. Document Form",
            usage: "Used on print and export surfaces that read the shared footer config.",
          };

          return (
            <Card key={config.moduleKey} className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#0F1059]" />
                  <CardTitle className="text-base font-semibold text-slate-900">{meta.title}</CardTitle>
                </div>
                <p className="text-sm text-slate-600">{meta.usage}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor={`${config.moduleKey}-prefix`}>Document Prefix</Label>
                  <Input
                    id={`${config.moduleKey}-prefix`}
                    value={config.prefix}
                    onChange={(e) => handleInputChange(config.moduleKey, "prefix", e.target.value)}
                    placeholder={meta.prefixPlaceholder}
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Preview: <span className="font-mono text-slate-700">{config.prefix || meta.prefixPlaceholder}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${config.moduleKey}-label`}>Document Label</Label>
                  <Input
                    id={`${config.moduleKey}-label`}
                    value={config.label}
                    onChange={(e) => handleInputChange(config.moduleKey, "label", e.target.value)}
                    placeholder={meta.labelPlaceholder}
                  />
                  <p className="text-xs text-slate-500">
                    Preview: <span className="font-medium text-slate-700">{config.label || meta.labelPlaceholder}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
