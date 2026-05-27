"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignaturePad from "./SignaturePad";
import type { SignatureType } from "@/types/dar";

interface Props {
  open: boolean;
  onConfirm: (dataUrl: string, type: SignatureType) => void;
  onCancel: () => void;
}

export default function DarSignSubmitModal({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ลงลายมือชื่อยืนยันคำขอ</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            กรุณาลงลายมือชื่อของคุณก่อนส่งคำขอ DAR
          </p>
        </DialogHeader>
        <SignaturePad onConfirm={onConfirm} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
