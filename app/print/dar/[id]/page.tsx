import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { QmsConfigService } from "@/services/qmsConfigService";
import DarPrintTemplate from "@/components/dar/DarPrintTemplate";
import { db } from "@/lib/db";

const darService = new DarService();
const qmsConfigService = new QmsConfigService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [dar, footerConfig] = await Promise.all([
    db.darMaster.findUnique({ where: { id }, select: { darNo: true } }),
    qmsConfigService.getSingleFooterConfig("DAR"),
  ]);

  const prefix = footerConfig.prefix.trim() || "FM-DC-01";
  return { title: dar?.darNo ? `${dar.darNo} - ${prefix}` : prefix };
}

export default async function PrintDarPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

  try {
    const [dar, footerConfig] = await Promise.all([
      darService.getDarById(id, session.user.id, isPrivileged),
      qmsConfigService.getSingleFooterConfig("DAR"),
    ]);
    return <DarPrintTemplate dar={dar} footerConfig={footerConfig} />;
  } catch {
    notFound();
  }
}
