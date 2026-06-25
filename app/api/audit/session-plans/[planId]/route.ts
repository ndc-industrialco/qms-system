import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);

const INCLUDE = {
  appointment: true,
  sessions: {
    orderBy: { orderIndex: "asc" as const },
    include: { teamMembers: { orderBy: [{ role: "asc" as const }, { name: "asc" as const }] } },
  },
  ganttRows: { orderBy: { orderIndex: "asc" as const } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await requireAuth();
    const { planId } = await params;
    const plan = await db.auditSessionPlan.findUnique({ where: { id: planId }, include: INCLUDE });
    if (!plan) throw new NotFoundError("Session plan not found");
    return sendSuccess(plan);
  } catch (err) {
    return handleApiError(err);
  }
}

type TeamMemberInput = { role: string; name: string; authUserId?: string | null };
type SessionInput = {
  orderIndex: number; auditDate: string; startTime: string; endTime: string;
  department: string; remark?: string | null; teamMembers: TeamMemberInput[];
};
type GanttRowInput = {
  orderIndex: number; department: string; processes: string[];
  planWeeks: string[]; actualWeeks: string[];
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const { planId } = await params;
    const existing = await db.auditSessionPlan.findUnique({ where: { id: planId } });
    if (!existing) throw new NotFoundError("Session plan not found");

    const body = await req.json() as {
      reviseNo?: number; reviseDate?: string | null;
      sessions: SessionInput[]; ganttRows: GanttRowInput[];
    };

    const plan = await db.$transaction(async (tx) => {
      await tx.auditSessionPlan.update({
        where: { id: planId },
        data: {
          reviseNo: body.reviseNo ?? existing.reviseNo,
          reviseDate: body.reviseDate ? new Date(body.reviseDate) : existing.reviseDate,
        },
      });

      await tx.auditSessionRow.deleteMany({ where: { planId } });
      await tx.auditGanttRow.deleteMany({ where: { planId } });

      for (const s of body.sessions) {
        const row = await tx.auditSessionRow.create({
          data: {
            planId, orderIndex: s.orderIndex,
            auditDate: new Date(s.auditDate),
            startTime: s.startTime, endTime: s.endTime,
            department: s.department, remark: s.remark ?? null,
          },
        });
        if (s.teamMembers.length) {
          await tx.auditSessionTeamMember.createMany({
            data: s.teamMembers.map((m) => ({
              sessionId: row.id, role: m.role, name: m.name, authUserId: m.authUserId ?? null,
            })),
          });
        }
      }

      if (body.ganttRows.length) {
        await tx.auditGanttRow.createMany({
          data: body.ganttRows.map((r) => ({
            planId, orderIndex: r.orderIndex, department: r.department,
            processes: r.processes, planWeeks: r.planWeeks, actualWeeks: r.actualWeeks,
          })),
        });
      }

      return tx.auditSessionPlan.findUnique({ where: { id: planId }, include: INCLUDE });
    });

    return sendSuccess(plan, "Session plan saved");
  } catch (err) {
    return handleApiError(err);
  }
}
