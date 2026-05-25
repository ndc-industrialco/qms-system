
import { requireRole } from "@/lib/auth";
import { listAnnouncements } from "@/services/announcement";
import AnnouncementsTableClient from "@/components/announcements/AnnouncementsTableClient";

export default async function ManageAnnouncementsPage() {
  await requireRole("QMS", "IT", "MR");

  const rows = await listAnnouncements();

  return <AnnouncementsTableClient rows={rows} />;
}
