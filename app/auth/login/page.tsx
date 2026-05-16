import { signIn } from "@/auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/qms/dashboard");

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card bg-base-100 shadow-sm rounded-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-[20px] font-semibold text-base-content">ระบบ QMS</h1>
            <p className="text-[14px] text-neutral mt-1">
              เข้าสู่ระบบด้วยบัญชี Microsoft 365 ขององค์กร
            </p>
          </div>

          <div className="divider text-[14px] text-neutral">ลงชื่อเข้าใช้</div>

          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/qms/dashboard" });
            }}
            className="w-full"
          >
            <button type="submit" className="btn btn-primary w-full gap-2">
              <MicrosoftIcon />
              เข้าสู่ระบบด้วย Microsoft 365
            </button>
          </form>

          <p className="text-[12px] text-neutral text-center">
            ระบบนี้รองรับเฉพาะบัญชีอีเมลของบริษัทที่เชื่อมต่อกับ Microsoft Entra ID เท่านั้น
          </p>
        </div>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
