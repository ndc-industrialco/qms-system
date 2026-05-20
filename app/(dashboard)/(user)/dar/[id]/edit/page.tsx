export const runtime = 'nodejs';

import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDarById } from "@/services/dar";
import { getActiveDepartments } from "@/services/department";
import DarForm from "@/components/dar/DarForm";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function DarEditPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

  let dar;
  try {
    dar = await getDarById(id, session.user.id, isPrivileged);
  } catch {
    notFound();
  }

  if (dar.status !== "DRAFT") redirect(`/dar/${id}`);

  const departments = await getActiveDepartments();

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <div className="flex items-center gap-2 text-[11px] md:text-xs text-gray-500 mb-4">
        <Link href="/dar" className="hover:text-neutral transition-colors">คำขอเอกสาร</Link>
        <span>/</span>
        <Link href={`/dar/${id}`} className="hover:text-neutral transition-colors">
          {dar.darNo ?? "ฉบับร่าง"}
        </Link>
        <span>/</span>
        <span className="text-neutral font-medium">แก้ไข</span>
      </div>
      <h1 className="text-xl md:text-2xl font-bold text-primary mb-6">แก้ไขคำขอเอกสาร</h1>
      <DarForm
        mode="edit"
        tempId={"temp_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now()}
        initialData={dar}
        departments={departments}
        requesterInfo={{
          name: dar.requester.name,
          employeeId: dar.requester.employeeId,
          department: dar.requester.department?.name ?? null,
          requestDate: dar.requestDate,
        }}
      />
    </div>
  );
}
