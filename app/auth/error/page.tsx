export const runtime = 'nodejs';

import Link from "next/link";

type SearchParams = Promise<{ error?: string }>;

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  const errorMessages: Record<string, { th: string; en: string }> = {
    AccessDenied: {
      th: "ถูกปฏิเสธการเข้าถึง — บัญชีของคุณไม่ได้รับอนุญาตให้เข้าใช้ระบบนี้",
      en: "Access denied — your account is not authorized to use this system",
    },
    Configuration: {
      th: "เกิดข้อผิดพลาดในการตั้งค่าระบบ กรุณาติดต่อ IT",
      en: "System configuration error. Please contact IT",
    },
    Default: {
      th: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      en: "An error occurred during sign in",
    },
  };

  const msg = errorMessages[error ?? "Default"] ?? errorMessages["Default"];

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card card-premium p-5 w-full max-w-md">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="text-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">เข้าสู่ระบบไม่สำเร็จ</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-2">{msg.th}</p>
            <p className="text-[11px] md:text-xs text-gray-500 mt-1">{msg.en}</p>
          </div>
          <Link href="/auth/login" className="btn btn-primary w-full">
            ลองอีกครั้ง
          </Link>
        </div>
      </div>
    </div>
  );
}
