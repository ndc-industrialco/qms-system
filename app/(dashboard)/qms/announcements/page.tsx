import { requireRole } from "@/lib/auth";
import { listAnnouncements } from "@/services/announcement";
import AnnouncementsTableClient from "@/components/announcements/AnnouncementsTableClient";

export default async function ManageAnnouncementsPage() {
  await requireRole("QMS", "IT", "MR");
  const rows = await listAnnouncements();
  return (
    <div className="max-w-350 mx-auto px-4 md:px-8">
      <AnnouncementsTableClient rows={rows} />
    </div>
  );
}
