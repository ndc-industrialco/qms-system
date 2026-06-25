/**
 * Audit appointment service — DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PUBLISHED
 */
import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuditAppointmentCreateInput, AuditAppointmentUpdateInput, AuditAppointmentRejectInput } from "@/lib/validations/audit";
import { sendAppointmentSignRequestEmail, sendAppointmentPublishedEmail, sendAppointmentRejectedEmail } from "./auditEmailService";
import { NotificationService } from "@/services/notificationService";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";

const userPrefRepo = new UserPreferenceRepository();

type SigBody = {
  signatureDataUrl?: string | null;
  signatureType?: string | null;
  saveSignature?: boolean;
};

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
  const yy = String(year).slice(-2);
  const prefix = `APPT-${yy}-`;

  // Find the lowest positive integer not already in use this year
  const likePattern = `${prefix}%`;
  const startPos = prefix.length + 1;
  const existing = await tx.$queryRaw<{ seq: number }[]>`
    SELECT CAST(SUBSTRING(appointment_no FROM ${startPos}) AS INTEGER) AS seq
    FROM audit_appointments
    WHERE appointment_no LIKE ${likePattern}
    ORDER BY seq
  `;
  const used = new Set(existing.map((r) => r.seq));
  let next = 1;
  while (used.has(next)) next++;

  return `${prefix}${String(next).padStart(3, "0")}`;
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
          emailGroupMailsCc: input.emailGroupMailsCc,
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

  async update(id: string, input: AuditAppointmentUpdateInput, actor: Actor) {
    if (!isPrivileged(actor.role))
      throw new ForbiddenError("Only QMS/IT/MR can update appointment letters");

    const appt = await db.auditAppointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "DRAFT")
      throw new ValidationError("Can only edit appointments in DRAFT status");

    const actorId = actor.authUserId ?? actor.userId;

    return db.$transaction(async (tx) => {
      // Replace members if provided
      if (input.members !== undefined) {
        await tx.auditAppointmentMember.deleteMany({ where: { appointmentId: id } });
        if (input.members.length > 0) {
          await tx.auditAppointmentMember.createMany({
            data: input.members.map((m, i) => ({
              appointmentId: id,
              authUserId: m.authUserId,
              name: m.name,
              department: m.department ?? null,
              role: m.role,
              standards: m.standards ?? [],
              orderIndex: m.orderIndex ?? i,
            })),
          });
        }
      }

      const updated = await tx.auditAppointment.update({
        where: { id },
        data: {
          ...(input.year !== undefined && { year: input.year }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.standards !== undefined && { standards: input.standards }),
          ...(input.reviewerAuthUserId !== undefined && { reviewerAuthUserId: input.reviewerAuthUserId }),
          ...(input.reviewerEmail !== undefined && { reviewerEmail: input.reviewerEmail }),
          ...(input.reviewerNameSnapshot !== undefined && { reviewerNameSnapshot: input.reviewerNameSnapshot }),
          ...(input.approverAuthUserId !== undefined && { approverAuthUserId: input.approverAuthUserId }),
          ...(input.approverEmail !== undefined && { approverEmail: input.approverEmail }),
          ...(input.approverNameSnapshot !== undefined && { approverNameSnapshot: input.approverNameSnapshot }),
          ...(input.emailGroupMails !== undefined && { emailGroupMails: input.emailGroupMails }),
          ...(input.emailGroupMailsCc !== undefined && { emailGroupMailsCc: input.emailGroupMailsCc }),
        },
        include: { members: { orderBy: { orderIndex: "asc" } }, signoffs: true },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
        },
        tx
      );

      return updated;
    });
  }

  async delete(id: string, actor: Actor) {
    if (!isPrivileged(actor.role))
      throw new ForbiddenError("Only QMS/IT/MR can delete appointment letters");

    const appt = await db.auditAppointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundError("Appointment not found");
    if (!["DRAFT", "PUBLISHED"].includes(appt.status) && !isPrivileged(actor.role))
      throw new ValidationError("Cannot delete a pending appointment");

    const actorId = actor.authUserId ?? actor.userId;

    return db.$transaction(async (tx) => {
      await tx.auditAppointmentSignoff.deleteMany({ where: { appointmentId: id } });
      await tx.auditAppointmentMember.deleteMany({ where: { appointmentId: id } });
      await tx.auditAppointment.delete({ where: { id } });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "DELETE",
          resourceType: "AUDIT_APPOINTMENT",
          resourceId: id,
          before: { status: appt.status, appointmentNo: appt.appointmentNo },
        },
        tx
      );
    });
  }

  async submit(id: string, actor: Actor, ownerSignaturePath?: string) {
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
        data: {
          status: "PENDING_REVIEW",
          rejectReason: null,
          ...(ownerSignaturePath ? { ownerSignaturePath } : {}),
        },
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

    logger.info("[appointment/submit] email check", {
      reviewerEmail: appt.reviewerEmail,
      hasToken: !!actor.accessToken,
    });
    if (appt.reviewerEmail) {
      sendAppointmentSignRequestEmail({
        to: {
          name: appt.reviewerNameSnapshot ?? appt.reviewerEmail,
          email: appt.reviewerEmail,
        },
        appointmentNo: updated.appointmentNo,
        title: updated.title,
        year: updated.year,
        standards: updated.standards,
        ownerName: appt.ownerNameSnapshot,
        signedRole: "REVIEWER",
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) =>
        logger.warn("[appointment] reviewer email failed", { error: String(err) })
      );
    }

    if (appt.reviewerAuthUserId) {
      const yearEn = updated.year - 543;
      NotificationService.createInAppNotification({
        recipientId: appt.reviewerAuthUserId,
        recipientAuthUserId: appt.reviewerAuthUserId,
        title: `Signature Required — ${updated.appointmentNo}`,
        body: `You have been assigned as Reviewer for appointment letter "${updated.title}" (Year ${yearEn}). Your signature is required to proceed.\nPrepared by: ${appt.ownerNameSnapshot ?? "—"}`,
        module: "AUDIT",
        resourceId: id,
        resourceType: "AUDIT_APPOINTMENT",
      }).catch((err) =>
        logger.warn("[appointment] reviewer in-app notification failed", { error: String(err) })
      );
    }

    return updated;
  }

  async review(id: string, actor: Actor, sigBody?: SigBody | null) {
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
          signaturePath: sigBody?.signatureDataUrl ?? null,
        },
      });

      if (sigBody?.saveSignature && sigBody.signatureDataUrl && actor.userId) {
        await userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: (sigBody.signatureType as "DRAW" | "TYPE" | "IMAGE") ?? "DRAW",
        }, tx);
      }

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
        year: updated.year,
        standards: updated.standards,
        ownerName: appt.ownerNameSnapshot,
        signedRole: "APPROVER",
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) =>
        logger.warn("[appointment] approver email failed", { error: String(err) })
      );
    }

    if (appt.approverAuthUserId) {
      const yearEn = updated.year - 543;
      NotificationService.createInAppNotification({
        recipientId: appt.approverAuthUserId,
        recipientAuthUserId: appt.approverAuthUserId,
        title: `Approval Required — ${updated.appointmentNo}`,
        body: `You have been assigned as Approver for appointment letter "${updated.title}" (Year ${yearEn}). Please review and approve to publish.\nPrepared by: ${appt.ownerNameSnapshot ?? "—"} · Reviewed by: ${appt.reviewerNameSnapshot ?? "—"}`,
        module: "AUDIT",
        resourceId: id,
        resourceType: "AUDIT_APPOINTMENT",
      }).catch((err) =>
        logger.warn("[appointment] approver in-app notification failed", { error: String(err) })
      );
    }

    return updated;
  }

  async approve(id: string, actor: Actor, sigBody?: SigBody | null) {
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
          signaturePath: sigBody?.signatureDataUrl ?? null,
        },
      });

      if (sigBody?.saveSignature && sigBody.signatureDataUrl && actor.userId) {
        await userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: (sigBody.signatureType as "DRAW" | "TYPE" | "IMAGE") ?? "DRAW",
        }, tx);
      }

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

    // Published email — to: emailGroupMails; cc: emailGroupMailsCc + owner + reviewer
    {
      const toList = appt.emailGroupMails.map((m) => ({ name: m, email: m }));
      const ccList: { name: string; email: string }[] = [
        ...appt.emailGroupMailsCc.map((m) => ({ name: m, email: m })),
      ];
      if (appt.ownerEmail) ccList.push({ name: appt.ownerNameSnapshot ?? appt.ownerEmail, email: appt.ownerEmail });
      if (appt.reviewerEmail) ccList.push({ name: appt.reviewerNameSnapshot ?? appt.reviewerEmail, email: appt.reviewerEmail });

      const allRecipients = toList.length ? toList : ccList.splice(0);
      if (allRecipients.length || ccList.length) {
        sendAppointmentPublishedEmail({
          recipients: allRecipients,
          cc: ccList.length ? ccList : undefined,
          appointmentNo: updated.appointmentNo,
          title: updated.title,
          year: updated.year,
          standards: updated.standards,
          members: appt.members,
          approverName: actor.nameSnapshot ?? actorId,
          ownerName: appt.ownerNameSnapshot,
          reviewerName: appt.reviewerNameSnapshot,
          appointmentId: id,
          senderAccessToken: actor.accessToken,
        }).catch((err) =>
          logger.error("[appointment] published email failed", { error: String(err) })
        );
      }
    }

    const pubYearEn = updated.year - 543;

    // In-app: notify owner
    if (appt.ownerAuthUserId) {
      NotificationService.createInAppNotification({
        recipientId: appt.ownerAuthUserId,
        recipientAuthUserId: appt.ownerAuthUserId,
        title: `Published — ${updated.appointmentNo}`,
        body: `Appointment letter "${updated.title}" (Year ${pubYearEn}) has been approved and published.\nApproved by: ${actor.nameSnapshot ?? "Approver"}`,
        module: "AUDIT",
        resourceId: id,
        resourceType: "AUDIT_APPOINTMENT",
      }).catch((err) =>
        logger.warn("[appointment] approve in-app notification (owner) failed", { error: String(err) })
      );
    }

    // In-app: notify reviewer that it's fully published
    if (appt.reviewerAuthUserId && appt.reviewerAuthUserId !== appt.ownerAuthUserId) {
      NotificationService.createInAppNotification({
        recipientId: appt.reviewerAuthUserId,
        recipientAuthUserId: appt.reviewerAuthUserId,
        title: `Published — ${updated.appointmentNo}`,
        body: `Appointment letter "${updated.title}" (Year ${pubYearEn}) has been approved and published by ${actor.nameSnapshot ?? "Approver"}.`,
        module: "AUDIT",
        resourceId: id,
        resourceType: "AUDIT_APPOINTMENT",
      }).catch((err) =>
        logger.warn("[appointment] approve in-app notification (reviewer) failed", { error: String(err) })
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
        year: appt.year,
        reason: input.reason,
        rejectedByName: actor.nameSnapshot,
        rejectedByRole: input.signedRole,
        appointmentId: id,
        senderAccessToken: actor.accessToken,
      }).catch((err) => logger.warn("[appointment] rejection email failed", { error: String(err) }));
    }

    if (appt.ownerAuthUserId) {
      const roleLabel = input.signedRole === "REVIEWER" ? "Reviewer" : "Approver";
      const rejectorName = actor.nameSnapshot ? `${actor.nameSnapshot} (${roleLabel})` : roleLabel;
      const rejectYearEn = appt.year - 543;
      NotificationService.createInAppNotification({
        recipientId: appt.ownerAuthUserId,
        recipientAuthUserId: appt.ownerAuthUserId,
        title: `Returned for Revision — ${appt.appointmentNo}`,
        body: `${rejectorName} returned appointment letter "${appt.title}" (Year ${rejectYearEn}) for revision.\nReason: ${input.reason}`,
        module: "AUDIT",
        resourceId: id,
        resourceType: "AUDIT_APPOINTMENT",
      }).catch((err) =>
        logger.warn("[appointment] reject in-app notification failed", { error: String(err) })
      );
    }

    return updated;
  }
}
