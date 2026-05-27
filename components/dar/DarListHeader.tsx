"use client";

import { useLocale } from "@/lib/locale-context";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

type Props = {
  onNewRequest: () => void;
};

export default function DarListHeader({ onNewRequest }: Props) {
  const locale = useLocale();

  const t = {
    title:      locale === "th" ? "คำขอเอกสาร (DAR)" : "Document Requests (DAR)",
    subtitle:   locale === "th" ? "จัดการและติดตามคำขอเอกสารของคุณ" : "Manage and track your document requests",
    newRequest: locale === "th" ? "สร้างคำขอใหม่" : "New Request",
  };

  return (
    <PageHeader
      title={t.title}
      subtitle={t.subtitle}
      className="mb-6"
      actions={
        <Button onClick={onNewRequest} className="gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">{t.newRequest}</span>
        </Button>
      }
    />
  );
}
