"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import type { DarDetail } from "@/types/dar";
import type { SignatureType } from "@/types/dar";
import DarApprovalPanel from "./DarApprovalPanel";
import DarStatusBadge from "./DarStatusBadge";

interface Props {
  initialDar: DarDetail;
  currentUserId: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onExternalUpdate?: (dar: DarDetail) => void;
}

export default function DarApprovalPanelWrapper({ initialDar, currentUserId, savedSignatureUrl, savedSignatureType, onExternalUpdate }: Props) {
  const t = useT();
  const router = useRouter();
  const [dar, setDar] = useState<DarDetail>(initialDar);
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleUpdated(updated: DarDetail) {
    setDar(updated);
    onExternalUpdate?.(updated);
    setFlash(t("dar.approval.successFlash"));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(null), 3000);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {flash && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="flex-1">{flash}</span>
          <div className="ml-auto">
            <DarStatusBadge status={dar.status} />
          </div>
        </div>
      )}
      <DarApprovalPanel
        dar={dar}
        currentUserId={currentUserId}
        savedSignatureUrl={savedSignatureUrl}
        savedSignatureType={savedSignatureType}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
