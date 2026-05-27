import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getDarById, getSavedSignature } from "@/services/dar";
import DarReadOnlyDetail from "@/components/dar/DarReadOnlyDetail";

type Props = { params: Promise<{ id: string }> };

export default async function DarDetailPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

  try {
    const [dar, savedSig] = await Promise.all([
      getDarById(id, session.user.id, isPrivileged),
      getSavedSignature(session.user.id),
    ]);

    const isQms = session.user.role === "QMS" || session.user.role === "MR";

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/dar" className="hover:text-slate-600 transition-colors">
            {isQms ? "Document Requests" : "คำขอเอกสาร"}
          </Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600 font-medium truncate">
            {dar.darNo ?? (isQms ? "Draft" : "ฉบับร่าง")}
          </span>
        </nav>

        <DarReadOnlyDetail
          dar={dar}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
          isQms={isQms}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
