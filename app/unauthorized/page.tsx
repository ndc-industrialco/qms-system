export const runtime = 'nodejs';

import Link from "next/link";

type SearchParams = Promise<{ reason?: string; from?: string }>;

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { reason } = await searchParams;

  const isNoM365 = reason === "no_m365_account";
  const isInsufficientRole = reason === "insufficient_role";

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card-premium w-full max-w-100 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-error" />

        <div className="p-5 flex flex-col items-center gap-6 text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-error/8 border border-error/15 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-2">
            <p className="text-xl font-bold text-primary">
              ไม่มีสิทธิ์เข้าถึง
            </p>

            {isNoM365 ? (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  บัญชีของคุณไม่ได้เชื่อมต่อกับ Microsoft 365 (Entra ID) ขององค์กร
                </p>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  ระบบ QMS อนุญาตเฉพาะพนักงานที่มีอีเมลบริษัทบน Microsoft 365 เท่านั้น
                </p>
                <p className="text-[11px] md:text-xs text-gray-500/70 mt-1">
                  กรุณาติดต่อฝ่าย IT เพื่อขอสิทธิ์การเข้าถึง
                </p>
              </>
            ) : isInsufficientRole ? (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้ของระบบ
                </p>
                <p className="text-[11px] md:text-xs text-gray-500/70 mt-1">
                  กรุณาติดต่อฝ่าย IT เพื่อขอปรับสิทธิ์การใช้งาน
                </p>
              </>
            ) : (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  คุณยังไม่ได้เข้าสู่ระบบ หรือ Session หมดอายุแล้ว
                </p>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  กรุณาเข้าสู่ระบบด้วยบัญชี Microsoft 365 ขององค์กร
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full pt-1">
            {isInsufficientRole ? (
              <Link href="/" className="btn btn-primary w-full h-10 text-[13.5px]">
                กลับหน้าหลัก
              </Link>
            ) : (
              <Link href="/auth/login" className="btn btn-primary w-full h-10 text-[13.5px]">
                เข้าสู่ระบบด้วย Microsoft 365
              </Link>
            )}
            <a
              href="mailto:it@company.com"
              className="btn btn-ghost btn-sm text-neutral text-[12.5px]"
            >
              ติดต่อฝ่าย IT
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
