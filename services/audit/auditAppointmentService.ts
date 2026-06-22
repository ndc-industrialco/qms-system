/**
 * Audit appointment service — DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PUBLISHED
 */
import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuditAppointmentCreateInput, AuditAppointmentRejectInput } from "@/lib/validations/audit";
import { sendAppointmentSignRequestEmail, sendAppointmentPublishedEmail, sendAppointmentRejectedEmail } from "./auditEmailService";

type Actor = {
  userId: string;
  authUserId?: string | null;
  role: string;
  nameSnapshot?: string | null;
  email?: string | null;
  accessToken?: string | null;
};

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const isPrivileged = (role: string) => PRIVILEGED.has(role);

async function nextAppointmentNo(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]
) {
  const year = new Date().getFullYear();
  const key = `AUDIT_APPT_COUNTER_${year}`;
  const yy = String(year).slice(-2);
  const result = await tx.$queryRaw<[{ configValue: string }]>`
    INSERT INTO "SystemConfig" ("configKey", "configValue", "description", "updatedAt")
    VALUES (${key}, '1', ${"Audit appointment counter for " + year}, NOW())
    ON CONFLICT ("configKey") DO UPDATE
      SET "configValue" = (CAST("SystemConfig"."configValue" AS INTEGER) + 1)::TEXT,
          "updatedAt"   = NOW()
    RETURNING "configValue"
  `;
  return `APPT-${yy}-${result[0].configValue.padStart(3, "0")}`;
}

export class AuditAppointmentService {
  async create(input: AuditAppointmentCreateInput, actor: Actor) {
    if (!isPrivileged(actor.role))
      throw new ForbiddenError("Only QMS/IT/MR can create appointment letters");

    const actorId = actor.authUserId ?? actor.userId;

    return db.$transaction(async (tx) => {
      const no = await nextAppointmentNo(tx);
      const appt = await tx.auditAppointment.create({
        data: {
          appointmentNo: no,
          year: input.year,
          title: input.title,
          standards: input.standards,
          ownerAuthUserId: actorId,
          ownerEmail: actor.email ?? null,
          ownerNameSnapshot: actor.nameSnapshot ?? null,
          reviewerAuthUserId: input.reviewerAuthUserId,
          reviewerEmail: input.reviewerEmail,
          reviewerNameSnapshot: input.reviewerNameSnapshot ?? null,
          approverAuthUserId: input.approverAuthUserId,
          approverEmail: input.approverEmail,
          approverNameSnapshot: input.approverNameSnapshot ?? null,
          emailGroupMails: input.emailGroupMails,
          members: {
            create: input.members.map((m, i) => ({
              authUserId: m.authUserId,
              name: m.name,
              department: m.department ?? null,
              role: m.role,
              standards: m.standards,
              orderIndex: m.orderIndex ?? i,
            })),
          },
        },
        include: { members: true, signoffs: true },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "CREATE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: appt.id,
        },
        tx
      );

      return appt;
    });
  }

  async findAll() {
    return db.auditAppointment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: { orderBy: { orderIndex: "asc" } },
        signoffs: true,
      },
    });
  }

  async findById(id: string) {
    return db.auditAppointment.findUnique({
      where: { id },
      include: {
        members: { orderBy: { orderIndex: "asc" } },
        signoffs: true,
      },
    });
  }

  async submit(id: string, actor: Actor) {
    const appt = await db.auditAppointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "DRAFT")
      throw new ValidationError(`Cannot submit from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged(actor.role) && actorId !== appt.ownerAuthUserId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "PENDING_REVIEW", rejectReason: null },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "SUBMIT",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: "DRAFT" },
          after: { status: "PENDING_REVIEW" },
        },
        tx
      );
      return u;
    });

    if (appt.reviewerEmail) {
      sendAppointmentSignRequestEmail({
        to: {
          name: appt.reviewerNameSnapshot ?? appt.reviewerEmail,
          email: appt.reviewerEmail,
        },
        appointmentNo: updated.appointmentNo,
        title: updated.title,
        signedRole: "REVIEWER",
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) =>
        logger.warn("[appointment] reviewer email failed", { error: String(err) })
      );
    }

    return updated;
  }

  async review(id: string, actor: Actor) {
    const appt = await db.auditAppointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "PENDING_REVIEW")
      throw new ValidationError(`Cannot review from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged(actor.role) && actorId !== appt.reviewerAuthUserId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.create({
        data: {
          appointmentId: id,
          signedByAuthUserId: actorId,
          signedRole: "REVIEWER",
          signerNameSnapshot: actor.nameSnapshot ?? null,
        },
      });
      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "PENDING_APPROVAL" },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "REVIEW",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: "PENDING_REVIEW" },
          after: { status: "PENDING_APPROVAL" },
        },
        tx
      );
      return u;
    });

    if (appt.approverEmail) {
      sendAppointmentSignRequestEmail({
        to: {
          name: appt.approverNameSnapshot ?? appt.approverEmail,
          email: appt.approverEmail,
        },
        appointmentNo: updated.appointmentNo,
        title: updated.title,
        signedRole: "APPROVER",
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) =>
        logger.warn("[appointment] approver email failed", { error: String(err) })
      );
    }

    return updated;
  }

  async approve(id: string, actor: Actor) {
    const appt = await db.auditAppointment.findUnique({
      where: { id },
      include: { members: { orderBy: { orderIndex: "asc" } } },
    });
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "PENDING_APPROVAL")
      throw new ValidationError(`Cannot approve from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged(actor.role) && actorId !== appt.approverAuthUserId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.create({
        data: {
          appointmentId: id,
          signedByAuthUserId: actorId,
          signedRole: "APPROVER",
          signerNameSnapshot: actor.nameSnapshot ?? null,
        },
      });
      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "APPROVE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: "PENDING_APPROVAL" },
          after: { status: "PUBLISHED" },
        },
        tx
      );
      return u;
    });

    if (appt.emailGroupMails.length > 0) {
      const recipients = appt.emailGroupMails.map((m) => ({ name: m, email: m }));
      sendAppointmentPublishedEmail({
        recipients,
        appointmentNo: updated.appointmentNo,
        title: updated.title,
        year: updated.year,
        standards: updated.standards,
        members: appt.members,
        approverName: actor.nameSnapshot ?? actorId,
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) =>
        logger.error("[appointment] published email failed", { error: String(err) })
      );
    }

    return updated;
  }

  async reject(id: string, input: AuditAppointmentRejectInput, actor: Actor) {
    const appt = await db.auditAppointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundError("Appointment not found");

    const validStatuses =
      input.signedRole === "REVIEWER" ? ["PENDING_REVIEW"] : ["PENDING_APPROVAL"];
    if (!validStatuses.includes(appt.status))
      throw new ValidationError(`Cannot reject from status ${appt.status}`);

    const actorId = actor.authUserId ?? actor.userId;
    const assignedId =
      input.signedRole === "REVIEWER"
        ? appt.reviewerAuthUserId
        : appt.approverAuthUserId;
    if (!isPrivileged(actor.role) && actorId !== assignedId)
      throw new ForbiddenError();

    const updated = await db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.deleteMany({ where: { appointmentId: id } });
      const u = await tx.auditAppointment.update({
        where: { id },
        data: { status: "DRAFT", rejectReason: input.reason },
      });
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "REJECT",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: appt.status },
          after: { status: "DRAFT" },
          metadata: { reason: input.reason },
        },
        tx
      );
      return u;
    });

    if (appt.ownerEmail) {
      sendAppointmentRejectedEmail({
        to: { name: appt.ownerNameSnapshot ?? appt.ownerEmail, email: appt.ownerEmail },
        appointmentNo: appt.appointmentNo,
        title: appt.title,
        reason: input.reason,
        rejectedByRole: input.signedRole,
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) => logger.warn("[appointment] rejection email failed", { error: String(err) }));
    }

    return updated;
  }
}
