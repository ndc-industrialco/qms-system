"use client";

import type { DarItemInput } from "@/types/dar";
import { useT } from "@/lib/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DarItemsTable({ items }: { items: DarItemInput[] }) {
  const t = useT();

  if (items.length === 0) {
    return <p className="text-[14px] text-slate-500">{t("emptyItemsTable")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">{t("colNo")}</TableHead>
          <TableHead>{t("colDocNum")}</TableHead>
          <TableHead>{t("colDocName")}</TableHead>
          <TableHead className="w-28">{t("colRevision")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.itemNo}>
            <TableCell className="text-slate-500">{item.itemNo}</TableCell>
            <TableCell>{item.docNumber}</TableCell>
            <TableCell>{item.docName}</TableCell>
            <TableCell>{item.revision}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
