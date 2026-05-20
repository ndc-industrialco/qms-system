export const runtime = 'nodejs';

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

    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex items-center gap-2 text-[11px] md:text-xs text-gray-500 mb-4">
          <Link href="/dar" className="hover:text-neutral transition-colors">คำขอเอกสาร</Link>
          <span>/</span>
          <span className="text-neutral font-medium">{dar.darNo ?? "ฉบับร่าง"}</span>
        </div>
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
