"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send } from "lucide-react";

interface Props {
  carId: string;
  carNo: string;
  onSuccess?: () => void;
}

async function issueCar(carId: string): Promise<void> {
  const res = await fetch(`/api/car/${carId}/issue`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to issue CAR");
  }
}

export default function CarIssueDialog({ carId, carNo, onSuccess }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => issueCar(carId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["car", carId] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Send className="w-3.5 h-3.5 mr-1.5" />
        {t("car.issue.btnIssue")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("car.issue.confirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-600">
              {t("car.issue.confirmMsg", { carNo })}{" "}
            </p>
            <p className="text-xs text-slate-400">{t("car.issue.confirmEmailNote")}</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
              {mutation.isPending ? t("car.issue.btnConfirming") : t("car.issue.btnConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
