import Link from "next/link";

type SearchParams = Promise<{ reason?: string; from?: string }>;

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { reason } = await searchParams;

  const isNoM365 = reason === "no_m365_account";

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card bg-base-100 shadow-sm rounded-xl p-8 w-full max-w-lg">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>

          <div>
            <h1 className="text-[20px] font-semibold text-base-content">
              ไม่มีสิทธิ์เข้าถึง
            </h1>
            {isNoM365 ? (
              <>
                <p className="text-[14px] text-neutral mt-2">
                  บัญชีของคุณไม่ได้เชื่อมต่อกับ Microsoft 365 (Entra ID) ขององค์กร
                </p>
                <p className="text-[14px] text-neutral mt-1">
                  ระบบ QMS อนุญาตเฉพาะพนักงานที่มีอีเมลบริษัทบน Microsoft 365 เท่านั้น
                </p>
                <p className="text-[12px] text-neutral mt-3">
                  กรุณาติดต่อฝ่าย IT เพื่อขอสิทธิ์การเข้าถึง
                </p>
              </>
            ) : (
              <>
                <p className="text-[14px] text-neutral mt-2">
                  คุณยังไม่ได้เข้าสู่ระบบ หรือ Session หมดอายุแล้ว
                </p>
                <p className="text-[14px] text-neutral mt-1">
                  กรุณาเข้าสู่ระบบด้วยบัญชี Microsoft 365 ขององค์กร
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Link href="/auth/login" className="btn btn-primary w-full">
              เข้าสู่ระบบด้วย Microsoft 365
            </Link>
            <a
              href="mailto:it@company.com"
              className="btn btn-ghost btn-sm text-neutral"
            >
              ติดต่อฝ่าย IT
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
