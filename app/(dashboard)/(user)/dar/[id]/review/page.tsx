import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getDarById, getSavedSignature } from "@/services/dar";
import DarReadOnlyDetail from "@/components/dar/DarReadOnlyDetail";

type Props = { params: Promise<{ id: string }> };

export default async function DarReviewPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged =
    session.user.role === "QMS" ||
    session.user.role === "MR" ||
    session.user.role === "IT";

  try {
    const [dar, savedSig] = await Promise.all([
      getDarById(id, session.user.id, isPrivileged),
      getSavedSignature(session.user.id),
    ]);

    // Only the assigned reviewer (PENDING) or privileged roles may use this page
    const isAssignedReviewer = dar.approvals.some(
      (a) =>
        a.stepRole === "REVIEWER" &&
        a.assignedUser.id === session.user.id &&
        a.action === "PENDING",
    );

    if (!isAssignedReviewer && !isPrivileged) {
      redirect(`/dar/${id}`);
    }

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-5">
        {/* Review banner */}
        {isAssignedReviewer && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                คุณได้รับมอบหมายให้ตรวจสอบคำขอนี้
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                กรุณาตรวจสอบรายละเอียดทั้งหมดด้านล่าง จากนั้นลงลายมือชื่อเพื่ออนุมัติหรือส่งคืนผู้จัดทำ
              </p>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/dar" className="hover:text-slate-600 transition-colors">
            คำขอเอกสาร
          </Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/dar/${id}`} className="hover:text-slate-600 transition-colors truncate">
            {dar.darNo ?? "คำขอ"}
          </Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600 font-medium">ตรวจสอบ</span>
        </nav>

        <DarReadOnlyDetail
          dar={dar}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
