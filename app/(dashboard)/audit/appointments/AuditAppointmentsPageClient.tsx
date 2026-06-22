"use client";

import { useState } from "react";
import { AuditAppointmentListClient } from "@/components/audit/AuditAppointmentListClient";
import { AuditAppointmentFormModal } from "@/components/audit/AuditAppointmentFormModal";
import type { AuditAppointmentRow } from "@/types/audit";

type Props = {
  initialData: AuditAppointmentRow[];
  canCreate: boolean;
};

export default function AuditAppointmentsPageClient({ initialData, canCreate }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <AuditAppointmentListClient
        initialData={initialData}
        canCreate={canCreate}
        onCreateClick={() => setModalOpen(true)}
      />
      <AuditAppointmentFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
