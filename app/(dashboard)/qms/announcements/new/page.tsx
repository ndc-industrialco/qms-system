
import { requireRole } from "@/lib/auth";
import AnnouncementForm from "@/components/dashboard/AnnouncementForm";
import NewAnnouncementHeader from "@/components/announcements/NewAnnouncementHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Announcement",
};

export default async function NewAnnouncementPage() {
  await requireRole("QMS", "IT", "MR");

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col gap-4">
      <NewAnnouncementHeader />
      <AnnouncementForm />
    </div>
  );
}
