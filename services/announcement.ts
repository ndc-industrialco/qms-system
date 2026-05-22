import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/lib/errors";

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  pushToCompanyCenter: boolean;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  fileName: string | null;
  spWebUrl: string | null;
  bgColor: string | null;
  bgImageUrl: string | null;
  bgImageSpId: string | null;
  textColor: string | null;
  createdAt: Date;
  createdBy: { name: string | null };
};

export type UpdateAnnouncementInput = {
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  pushToCompanyCenter: boolean;
  startDate: Date | null;
  endDate: Date | null;
  bgColor?: string | null;
  bgImageUrl?: string | null;
  bgImageSpId?: string | null;
  textColor?: string | null;
};

export async function listAnnouncements(): Promise<AnnouncementRow[]> {
  return db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function getAnnouncement(id: string): Promise<AnnouncementRow> {
  const row = await db.announcement.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!row) throw new NotFoundError("Announcement not found");
  return row;
}

export async function updateAnnouncement(id: string, data: UpdateAnnouncementInput): Promise<{ id: string }> {
  const existing = await db.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("Announcement not found");
  return db.announcement.update({ where: { id }, data: data as Prisma.AnnouncementUpdateInput, select: { id: true } });
}

export async function toggleAnnouncementActive(id: string, active: boolean): Promise<{ id: string }> {
  const existing = await db.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("Announcement not found");
  return db.announcement.update({
    where: { id },
    data: { status: active ? "ACTIVE" : "INACTIVE" },
    select: { id: true },
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const existing = await db.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("Announcement not found");
  await db.announcement.delete({ where: { id } });
}
