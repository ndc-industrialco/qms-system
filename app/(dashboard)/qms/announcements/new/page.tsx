export const runtime = 'nodejs';

import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import AnnouncementForm from "@/components/dashboard/AnnouncementForm";

export default async function NewAnnouncementPage() {
  const session = await requireAuth();

  if (!["QMS", "IT", "MR"].includes(session.user.role)) {
    return <div className="p-8 text-error font-bold text-center">Unauthorized</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col gap-4">
      <div>
        <Link href="/qms/announcements" className="text-xs md:text-sm font-semibold text-gray-500 hover:text-primary flex items-center gap-1 mb-3 w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Announcements
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-primary">Create Announcement</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">Fill in the details to publish a new announcement</p>
      </div>

      <AnnouncementForm />
    </div>
  );
}
