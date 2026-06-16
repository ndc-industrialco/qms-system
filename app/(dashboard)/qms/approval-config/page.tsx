import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ForbiddenError } from "@/errors/customErrors";
import { redirect } from "next/navigation";
import { ApprovalConfigService } from "@/services/approvalConfigService";
import ApprovalConfigClient from "@/components/qms/ApprovalConfigClient";

export const metadata: Metadata = {
  title: "DAR Approver Configuration",
};

const service = new ApprovalConfigService();

export default async function QmsApprovalConfigPage() {
  let session;
  try {
    session = await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  const data = await service.getConfig(session.user.accessToken);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ApprovalConfigClient
        users={data.users}
        currentMrUserId={data.currentMrUserId}
        currentQmsUserId={data.currentQmsUserId}
      />
    </div>
  );
}
