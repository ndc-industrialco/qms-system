import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAuthCenterDepartmentMembers } from "@/lib/auth-center-admin-client";
import { AuditService } from "@/services/auditService";
import { CarRepository } from "@/repositories/carRepository";
import { CarSequenceRepository } from "@/repositories/carSequenceRepository";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { getDepartmentByCode, getDepartmentByName } from "@/lib/departmentCache";
import { ActionTokenService } from "@/services/actionTokenService";
import { NotFoundError, ValidationError, ForbiddenError } from "@/errors/customErrors";
import type { CarCreateInput, CarUpdateInput, CarRespondInput, CarVerifyInput, CarReviewResponseInput, CarListQuery } from "@/lib/validations/car";
import type { CarStatus, CarSourceType, VerificationResult } from "@/generated/prisma/client";
import type { CarListScope } from "@/types/car";
import { sendCarIssuedEmail, sendCarReminderEmail, sendCarRespondedEmail, sendCarMrReviewRequestEmail, sendCarPlanApprovedEmail, sendCarPlanRejectedEmail, sendCarVerifyPassEmail, sendCarVerify2NotifyEmail, sendCarReCarEmail } from "@/services/carEmailService";
import { CarReminderService } from "@/services/carReminderService";
import { notifyCarUser, canReceiveEmail } from "@/services/carNotificationService";
import type { PaginatedResult } from "@/repositories/baseRepository";

type CarDetailRaw = NonNullable<Awaited<ReturnType<CarRepository["findDetailById"]>>>;

export type CarDetail = {
  id: string;
  carNo: string;
  carYear: number;
  sequenceNo: number;
  status: CarStatus;
  sourceType: CarSourceType;
  sourceDetail: string | null;
  isoStandards: string[];
  defectDetail: string;
  nonConformanceRef: string;
  issuerPosition: string;
  issuedAt: string | null;
  responseDueAt: string | null;
  reCar: boolean;
  reCarRefId: string | null;
  reCarRef: { id: string; carNo: string } | null;
  reCarChildren: { id: string; carNo: string; status: string }[];
  createdAt: string;
  updatedAt: string;
  targetAuthDepartmentId?: string | null;
  issuer: { id: string; authUserId?: string | null; name: string | null; employeeId: string | null; department: { id: string; name: string } | null };
  targetDepartment: { id: string; name: string; emailGroup: string | null };
  targetEmailGroups: string[];
  targetEmailGroupsCc: string[];
  response: CarResponseDetail | null;
  verifications: CarVerificationDetail[];
  mrSignature: CarMrSignatureDetail | null;
  mrResponseReview: CarMrResponseReviewDetail | null;
};

export type CarResponseDetail = {
  id: string;
  responderId: string;
  responderAuthUserId?: string | null;
  responderPosition: string;
  respondedAt: string;
  whyAnalysis: string;
  additionalToolDetail: string | null;
  rootCausePerson: boolean;
  rootCauseMaterial: boolean;
  rootCauseMachine: boolean;
  rootCauseMethod: boolean;
  rootCauseOther: boolean;
  rootCauseOtherDetail: string | null;
  rootCauseSummary: string;
  immediateAction: string;
  preventiveAction: string;
  plannedCompletionDate: string;
  responder: { id: string; authUserId?: string | null; name: string | null; employeeId: string | null };
  attachments: CarAttachmentRow[];
};

export type CarVerificationDetail = {
  id: string;
  round: number;
  verifierId: string;
  verifierAuthUserId?: string | null;
  verifierPosition: string;
  verifiedAt: string;
  findings: string;
  result: VerificationResult;
  nextDueDate: string | null;
  verifier: { id: string; authUserId?: string | null; name: string | null; employeeId: string | null };
};

export type CarMrSignatureDetail = {
  id: string;
  mrUserId: string;
  mrAuthUserId?: string | null;
  signedAt: string;
  comment: string | null;
  mrUser: { id: string; authUserId?: string | null; name: string | null; employeeId: string | null };
};

export type CarMrResponseReviewDetail = {
  id: string;
  mrUserId: string;
  mrAuthUserId?: string | null;
  reviewedAt: string;
  action: "APPROVED" | "REJECTED";
  comment: string | null;
  mrUser: { id: string; authUserId?: string | null; name: string | null; employeeId: string | null };
};

export type CarAttachmentRow = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  folderPath: string;
  createdAt: string;
  uploadedBy: { id: string; name: string | null };
};

export type CarSummary = {
  id: string;
  carNo: string;
  carYear: number;
  status: CarStatus;
  sourceType: CarSourceType;
  defectDetail: string;
  issuedAt: string | null;
  responseDueAt: string | null;
  createdAt: string;
  targetAuthDepartmentId?: string | null;
  issuer: { id: string; name: string | null };
  targetDepartment: { id: string; name: string };
  verificationCount: number;
};

type IdentitySnapshot = {
  id: string;
  authUserId: string | null;
  name: string | null;
  email: string | null;
  employeeId: string | null;
  m365Linked: boolean;
  department: { id: string; name: string } | null;
};

export class CarService {
  private carRepo = new CarRepository();
  private seqRepo = new CarSequenceRepository();
  private configRepo = new SystemConfigRepository();

  private normalizeReCarInput<T extends { reCar?: boolean; reCarRefId?: string | null }>(input: T): T {
    const trimmedRef = typeof input.reCarRefId === "string" ? input.reCarRefId.trim() : input.reCarRefId;
    return {
      ...input,
      reCarRefId: input.reCar ? (trimmedRef || undefined) : undefined,
    };
  }

  private async getIdentitySnapshot(authUserId: string): Promise<IdentitySnapshot | null> {
    const { getUserSnapshot } = await import("@/lib/userSnapshotCache");
    const cached = await getUserSnapshot(authUserId);
    if (cached) {
      return {
        id: cached.authUserId,
        authUserId: cached.authUserId,
        name: cached.name,
        email: cached.email,
        employeeId: cached.employeeId,
        m365Linked: cached.m365Linked ?? false,
        department: cached.departmentName
          ? { id: cached.departmentId ?? cached.authUserId, name: cached.departmentName }
          : null,
      };
    }
    return null;
  }

  /** Resolve the designated MR user, preferring Auth Center stable key. */
  private async resolveMrUser(): Promise<{ authUserId: string } | null> {
    const authKey = await this.configRepo.findValueByKey("CURRENT_MR_AUTH_USER_ID");
    if (authKey) return { authUserId: authKey };
    const localKey = await this.configRepo.findValueByKey("CURRENT_MR_USER_ID");
    if (localKey) return { authUserId: localKey };
    return null;
  }

  private mapDetail(raw: CarDetailRaw): CarDetail {
    return {
      id: raw.id,
      carNo: raw.carNo,
      carYear: raw.carYear,
      sequenceNo: raw.sequenceNo,
      status: raw.status,
      sourceType: raw.sourceType as CarSourceType,
      sourceDetail: raw.sourceDetail,
      isoStandards: raw.isoStandards,
      defectDetail: raw.defectDetail,
      nonConformanceRef: raw.nonConformanceRef,
      issuerPosition: raw.issuerPosition,
      issuedAt: raw.issuedAt?.toISOString() ?? null,
      responseDueAt: raw.responseDueAt?.toISOString() ?? null,
      reCar: raw.reCar,
      reCarRefId: raw.reCarRefId,
      reCarRef: raw.reCarRef ?? null,
      reCarChildren: raw.reCarChildren,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      targetAuthDepartmentId: raw.targetAuthDepartmentId ?? null,
      issuer: {
        id: raw.issuerId,
        authUserId: raw.issuerAuthUserId ?? null,
        name: raw.issuerName ?? null,
        employeeId: raw.issuerEmployeeId ?? null,
        department: null,
      },
      targetDepartment: {
        id: raw.targetDepartmentId,
        name: raw.targetDepartmentName ?? "-",
        emailGroup: raw.targetEmailGroups?.[0] ?? null,
      },
      targetEmailGroups: raw.targetEmailGroups ?? [],
      targetEmailGroupsCc: raw.targetEmailGroupsCc ?? [],
      response: raw.response
        ? {
            id: raw.response.id,
            responderId: raw.response.responderId,
            responderAuthUserId: raw.response.responderAuthUserId ?? null,
            responderPosition: raw.response.responderPosition,
            respondedAt: raw.response.respondedAt.toISOString(),
            whyAnalysis: raw.response.whyAnalysis,
            additionalToolDetail: raw.response.additionalToolDetail,
            rootCausePerson: raw.response.rootCausePerson,
            rootCauseMaterial: raw.response.rootCauseMaterial,
            rootCauseMachine: raw.response.rootCauseMachine,
            rootCauseMethod: raw.response.rootCauseMethod,
            rootCauseOther: raw.response.rootCauseOther,
            rootCauseOtherDetail: raw.response.rootCauseOtherDetail,
            rootCauseSummary: raw.response.rootCauseSummary,
            immediateAction: raw.response.immediateAction,
            preventiveAction: raw.response.preventiveAction,
            plannedCompletionDate: raw.response.plannedCompletionDate.toISOString(),
            responder: {
              id: raw.response.responderId,
              authUserId: raw.response.responderAuthUserId ?? null,
              name: raw.response.responderName ?? null,
              employeeId: raw.response.responderEmployeeId ?? null,
            },
            attachments: raw.response.attachments.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
              spItemId: a.spItemId,
              spWebUrl: a.spWebUrl,
              spDownloadUrl: a.spDownloadUrl,
              folderPath: a.folderPath,
              createdAt: a.createdAt.toISOString(),
              uploadedBy: { id: a.uploadedById, name: a.uploadedByName ?? null },
            })),
          }
        : null,
      verifications: raw.verifications.map((v) => ({
        id: v.id,
        round: v.round,
        verifierId: v.verifierId,
        verifierAuthUserId: v.verifierAuthUserId ?? null,
        verifierPosition: v.verifierPosition,
        verifiedAt: v.verifiedAt.toISOString(),
        findings: v.findings,
        result: v.result as VerificationResult,
        nextDueDate: v.nextDueDate?.toISOString() ?? null,
        verifier: {
          id: v.verifierId,
          authUserId: v.verifierAuthUserId ?? null,
          name: v.verifierName ?? null,
          employeeId: v.verifierEmployeeId ?? null,
        },
      })),
      mrSignature: raw.mrSignature
        ? {
            id: raw.mrSignature.id,
            mrUserId: raw.mrSignature.mrUserId,
            mrAuthUserId: raw.mrSignature.mrAuthUserId ?? null,
            signedAt: raw.mrSignature.signedAt.toISOString(),
            comment: raw.mrSignature.comment,
            mrUser: {
              id: raw.mrSignature.mrUserId,
              authUserId: raw.mrSignature.mrAuthUserId ?? null,
              name: raw.mrSignature.mrUserName ?? null,
              employeeId: raw.mrSignature.mrEmployeeId ?? null,
            },
          }
        : null,
      mrResponseReview: raw.mrResponseReview
        ? {
            id: raw.mrResponseReview.id,
            mrUserId: raw.mrResponseReview.mrUserId,
            mrAuthUserId: raw.mrResponseReview.mrAuthUserId ?? null,
            reviewedAt: raw.mrResponseReview.reviewedAt.toISOString(),
            action: raw.mrResponseReview.action as "APPROVED" | "REJECTED",
            comment: raw.mrResponseReview.comment,
            mrUser: {
              id: raw.mrResponseReview.mrUserId,
              authUserId: raw.mrResponseReview.mrAuthUserId ?? null,
              name: raw.mrResponseReview.mrUserName ?? null,
              employeeId: raw.mrResponseReview.mrEmployeeId ?? null,
            },
          }
        : null,
    };
  }

  private buildCarNo(year: number, seq: number): string {
    const yy = String(year).slice(-2);
    return `C${yy}-${String(seq).padStart(3, "0")}`;
  }

  async getAllCars(): Promise<CarSummary[]> {
    const raws = await this.carRepo.findManySummary();
    return this.mapSummaries(raws);
  }

  async getCarsByDepartment(departmentId: string): Promise<CarSummary[]> {
    const raws = await this.carRepo.findManyByDepartment(departmentId);
    return this.mapSummaries(raws);
  }

  async listCars(
    query: CarListQuery,
    scope: { scope: CarListScope; issuerAuthUserId?: string; authDepartmentId?: string | null }
  ): Promise<PaginatedResult<CarSummary>> {
    if (scope.scope === "mine" && !scope.issuerAuthUserId) {
      throw new ValidationError("Auth Center user scope is required for mine filter.");
    }
    if (scope.scope === "my-department" && !scope.authDepartmentId) {
      throw new ValidationError("Auth Center department scope is required for department filter.");
    }

    const result = await this.carRepo.paginateSummaries(query, scope);
    return {
      data: this.mapSummaries(result.data),
      meta: result.meta,
    };
  }

  private mapSummaries(
    raws: Awaited<ReturnType<CarRepository["findManySummary"]>>
  ): CarSummary[] {
    return raws.map((r) => ({
      id: r.id,
      carNo: r.carNo,
      carYear: r.carYear,
      status: r.status,
      sourceType: r.sourceType as CarSourceType,
      defectDetail: r.defectDetail,
      issuedAt: r.issuedAt?.toISOString() ?? null,
      responseDueAt: r.responseDueAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      targetAuthDepartmentId: (r as { targetAuthDepartmentId?: string | null }).targetAuthDepartmentId ?? null,
      issuer: { id: r.issuerId, name: r.issuerName ?? null },
      targetDepartment: { id: r.targetDepartmentId, name: r.targetDepartmentName ?? "-" },
      verificationCount: r._count.verifications,
    }));
  }

  async getCarById(id: string): Promise<CarDetail> {
    const raw = await this.carRepo.findDetailById(id);
    if (!raw) throw new NotFoundError("CAR");
    return this.mapDetail(raw);
  }

  async createCar(issuerId: string, input: CarCreateInput, issuerAuthUserId?: string | null): Promise<CarDetail> {
    const normalizedInput = this.normalizeReCarInput(input);
    const year = new Date().getFullYear();
    const issuerSnapshot = await this.getIdentitySnapshot(issuerId);
    if (!issuerSnapshot) throw new ValidationError("Issuer not found");

    const targetDept = await getDepartmentByCode(normalizedInput.targetDepartmentId)
      ?? await getDepartmentByName(normalizedInput.targetDepartmentId);
    const targetAuthDepartmentId = targetDept?.code ?? normalizedInput.targetDepartmentId;

    const id = await db.$transaction(async (tx) => {
      if (normalizedInput.reCarRefId) {
        const refCar = await this.carRepo.findById(normalizedInput.reCarRefId, tx);
        if (!refCar) {
          throw new ValidationError("CAR ที่อ้างอิง (reCarRefId) ไม่มีอยู่ในระบบ");
        }
      }

      const seq = await this.seqRepo.nextSequence(year, tx);
      const carNo = this.buildCarNo(year, seq);

      const car = await this.carRepo.createDraft({
        ...normalizedInput,
        issuerId,
        issuerAuthUserId: issuerAuthUserId ?? null,
        issuerName: issuerSnapshot.name,
        issuerEmployeeId: issuerSnapshot.employeeId,
        targetAuthDepartmentId,
        targetDepartmentName: targetDept?.displayName ?? null,
        carNo,
        carYear: year,
        sequenceNo: seq,
      }, tx);

      await AuditService.record({
        actorUserId: issuerId,
        actorAuthUserId: issuerAuthUserId,
        actorRole: "QMS",
        action: "CREATE",
        resourceType: "CAR",
        resourceId: car.id,
        after: { carNo, status: "DRAFT" },
      }, tx);

      return car.id;
    });

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async updateCar(id: string, _issuerId: string, input: CarUpdateInput): Promise<CarDetail> {
    const normalizedInput = this.normalizeReCarInput(input);
    const existing = await this.carRepo.findById(id);
    if (!existing) throw new NotFoundError("CAR");
    if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT CAR records can be updated.");

    if (normalizedInput.reCarRefId) {
      const refCar = await this.carRepo.findById(normalizedInput.reCarRefId);
      if (!refCar) {
        throw new ValidationError("CAR ที่อ้างอิง (reCarRefId) ไม่มีอยู่ในระบบ");
      }
    }

    // Dual-write targetAuthDepartmentId from Auth Center cache
    const targetDept = normalizedInput.targetDepartmentId
      ? (await getDepartmentByCode(normalizedInput.targetDepartmentId)
        ?? await getDepartmentByName(normalizedInput.targetDepartmentId))
      : null;
    const targetAuthDepartmentId = targetDept?.code ?? normalizedInput.targetDepartmentId ?? null;

    await this.carRepo.updateDraft(id, normalizedInput, targetAuthDepartmentId, targetDept?.displayName ?? null);

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async cancelCar(id: string, actorId: string, actorAuthUserId?: string | null): Promise<void> {
    const existing = await this.carRepo.findById(id);
    if (!existing) throw new NotFoundError("CAR");
    if (existing.status === "CLOSED") throw new ValidationError("Cannot cancel a closed CAR.");

    await db.$transaction(async (tx) => {
      await this.carRepo.updateStatus(id, "CANCELLED", tx);
      await AuditService.record({
        actorUserId: actorId,
        actorAuthUserId: actorAuthUserId,
        actorRole: "QMS",
        action: "DELETE",
        resourceType: "CAR",
        resourceId: id,
        before: { status: existing.status },
        after: { status: "CANCELLED" },
      }, tx);
    });
  }

  async hardDeleteCar(id: string, actorId: string, actorAuthUserId?: string | null): Promise<void> {
    const existing = await this.carRepo.findById(id);
    if (!existing) throw new NotFoundError("CAR");

    await db.$transaction(async (tx) => {
      await tx.carMaster.delete({ where: { id } });
      await AuditService.record({
        actorUserId: actorId,
        actorAuthUserId,
        actorRole: "QMS",
        action: "DELETE",
        resourceType: "CAR",
        resourceId: id,
        before: { status: existing.status, carNo: (existing as Record<string, unknown>).carNo },
        after: null,
      }, tx);
    });
  }

  async issueCar(
    id: string,
    actorId: string,
    actorAuthUserId?: string | null,
    accessToken?: string | null,
  ): Promise<{ car: CarDetail; emailQueued: boolean; emailSkipReason?: string }> {
    const car = await this.carRepo.findForIssue(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "DRAFT") throw new ValidationError("Only DRAFT CAR records can be issued.");

    // Check issuer m365Linked — only send email if issuer has M365 account
    const now = new Date();
    const responseDueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const emailTargets = car.targetEmailGroups ?? [];
    const emailCc = car.targetEmailGroupsCc ?? [];

    await db.$transaction(async (tx) => {
      await this.carRepo.issue(id, now, responseDueAt, tx);

      for (const email of emailTargets) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: "ISSUED", recipient: email }, tx);
      }

      await AuditService.record({
        actorUserId: actorId,
        actorAuthUserId: actorAuthUserId,
        actorRole: "QMS",
        action: "ISSUE",
        resourceType: "CAR",
        resourceId: id,
        before: { status: "DRAFT" },
        after: { status: "ISSUED", issuedAt: now.toISOString() },
      }, tx);
    });

    // Schedule 3-day reminder (best-effort, non-blocking)
    CarReminderService.schedule(id, accessToken).catch((err) =>
      logger.warn("[CarService.issueCar] Failed to schedule reminder", { carId: id, error: String(err) })
    );

    let emailQueued = false;
    let emailSkipReason: string | undefined;

    // Email always follows selected To/CC groups.
    // If issuer has a delegated M365 token, send from their account; otherwise use MAIL_SENDER.
    if (emailTargets.length === 0) {
      emailSkipReason = "No target email group (To) selected";
      logger.info("[CarService.issueCar] Email skipped - no email targets", { carId: id });
    } else if (!accessToken) {
      emailSkipReason = "Sender not linked to Microsoft 365";
      logger.warn("[CarService.issueCar] Email skipped - no sender access token", { carId: id });
    } else {
      emailQueued = true;
      for (const email of emailTargets) {
        sendCarIssuedEmail({ carId: id, carNo: car.carNo, targetEmail: email, cc: emailCc, senderAccessToken: accessToken }).catch((err) =>
          logger.error("[CarService.issueCar] Email failed", { email, error: err instanceof Error ? err.message : String(err) })
        );
      }
    }

    /*
    if (emailTargets.length === 0) {
      emailSkipReason = "ผู้ออก CAR ไม่ได้เชื่อมต่อ Microsoft 365";
      logger.info("[CarService.issueCar] Email skipped — issuer not m365Linked", { carId: id, actorId });
    } else {
      emailSkipReason = "ไม่ได้เลือกกลุ่มอีเมล (To)";
      logger.info("[CarService.issueCar] Email skipped — no email targets", { carId: id });
    } else {
      emailQueued = true;
      for (const email of emailTargets) {
        sendCarIssuedEmail({ carId: id, carNo: car.carNo, targetEmail: email, cc: emailCc }).catch((err) =>
          logger.error("[CarService.issueCar] Email failed", { email, error: err instanceof Error ? err.message : String(err) })
        );
      }
    }

    */

    const targetDeptCode = car.targetAuthDepartmentId ?? car.targetDepartmentId;
    if (targetDeptCode && accessToken) {
      getAuthCenterDepartmentMembers(targetDeptCode, { accessToken })
        .then(async (deptResult) => {
          const recipients = [...new Set((deptResult?.members ?? []).map((member) => member.id).filter(Boolean))];
          await Promise.all(
            recipients.map((recipientAuthUserId) =>
              notifyCarUser({
                recipientAuthUserId,
                event: "ISSUED",
                carNo: car.carNo,
                carId: id,
                body: `CAR หมายเลข ${car.carNo} ถูกส่งถึงแผนก ${car.targetDepartmentName ?? "-"}`,
              })
            )
          );
        })
        .catch((err) => {
          logger.error("[CarService.issueCar] Department notification failed", {
            carId: id,
            targetDeptCode,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    } else {
      logger.warn("[CarService.issueCar] Department notification skipped", {
        carId: id,
        reason: targetDeptCode ? "missing-access-token" : "missing-target-department",
      });
    }

    // Notify the issuer that the CAR was issued (so they see something in their notification feed)
    if (actorAuthUserId) {
      notifyCarUser({
        recipientAuthUserId: actorAuthUserId,
        event: "ISSUED",
        carNo: car.carNo,
        carId: id,
        body: `CAR ${car.carNo} ออกแล้ว — รอการตอบกลับจาก ${car.targetDepartmentName ?? "แผนกที่เกี่ยวข้อง"}`,
      }).catch(() => null);
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return { car: this.mapDetail(detail), emailQueued, emailSkipReason };
  }

  async respondToCar(
    id: string,
    responderId: string,
    responderDepartmentId: string | null | undefined,
    input: CarRespondInput,
    responderAuthUserId?: string | null,
    responderAuthDepartmentId?: string | null,
    accessToken?: string | null,
  ): Promise<CarDetail> {
    const car = await this.carRepo.findForRespond(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "ISSUED") throw new ValidationError("Only ISSUED CAR records can be responded to.");

    // Prefer authDepartmentId check when both sides are available
    const carAuthDeptId = (car as Record<string, unknown>).targetAuthDepartmentId as string | null | undefined;
    const inTargetDept = (responderAuthDepartmentId && carAuthDeptId)
      ? carAuthDeptId === responderAuthDepartmentId
      : responderDepartmentId === car.targetDepartmentId;
    if (!inTargetDept) throw new ForbiddenError("You do not have permission to respond to this CAR.");

    const [mrEmail, mrUser, qmsEmail] = await Promise.all([
      this.configRepo.findValueByKey("CURRENT_MR_EMAIL"),
      this.resolveMrUser(),
      this.configRepo.findValueByKey("CURRENT_QMS_EMAIL"),
    ]);
    const responderSnapshot = await this.getIdentitySnapshot(responderId);
    if (!responderSnapshot) throw new ValidationError("Responder not found");
    const mrSnapshot = mrUser ? await this.getIdentitySnapshot(mrUser.authUserId) : null;
    const infoRecipients = [qmsEmail].filter(Boolean) as string[];
    const plannedDate = input.plannedCompletionDate;

    let mrReviewToken: string | null = null;

    await db.$transaction(async (tx) => {
      await this.carRepo.createResponseAndSetStatus(
        id,
        responderId,
        {
          responderAuthUserId: responderAuthUserId ?? responderSnapshot.authUserId,
          responderName: responderSnapshot.name,
          responderEmployeeId: responderSnapshot.employeeId,
        },
        input,
        tx
      );

      // Issue ActionToken for MR — use auth-stable localUserId as issuedTo
      if (mrUser) {
        mrReviewToken = await ActionTokenService.issue({
          module: "CAR",
          documentId: id,
          role: "APPROVER_MR",
          issuedTo: mrUser.authUserId,
        });
      }

      if (mrEmail) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: "MR_REVIEW_REQUEST", recipient: mrEmail }, tx);
      }
      for (const r of infoRecipients) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: "RESPONSE_RECEIVED", recipient: r }, tx);
      }

      await AuditService.record({
        actorUserId: responderId,
        actorAuthUserId: responderAuthUserId,
        actorRole: "USER",
        action: "RESPOND",
        resourceType: "CAR",
        resourceId: id,
        before: { status: "ISSUED" },
        after: { status: "RESPONDED" },
      }, tx);
    });

    // Cancel reminder — CAR has been responded to
    CarReminderService.cancel(id).catch(() => {});

    // Send emails after transaction committed (non-blocking)
    if (mrEmail && mrReviewToken && canReceiveEmail(mrSnapshot?.m365Linked)) {
      sendCarMrReviewRequestEmail({
        carId: id,
        carNo: car.carNo,
        mrEmail,
        token: mrReviewToken,
        plannedCompletionDate: plannedDate,
        senderAccessToken: accessToken,
      }).catch((err) => logger.error("[CarService.respondToCar] MR review email failed", err));
    }
    if (infoRecipients.length > 0) {
      sendCarRespondedEmail({ carId: id, carNo: car.carNo, recipients: infoRecipients, senderAccessToken: accessToken }).catch((err) =>
        logger.error("[CarService.respondToCar] QMS email failed", err)
      );
    }
    // In-app notifications
    if (mrUser) {
      notifyCarUser({ recipientAuthUserId: mrUser.authUserId, event: "MR_REVIEW", carNo: car.carNo, carId: id });
    }
    if (car.issuerAuthUserId) {
      notifyCarUser({ recipientAuthUserId: car.issuerAuthUserId, event: "RESPONDED", carNo: car.carNo, carId: id });
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async reviewResponseByMR(id: string, input: CarReviewResponseInput): Promise<CarDetail> {
    if (!input.token) throw new ValidationError("Approval token is required.");
    const token = input.token;

    const { ActionTokenRepository } = await import("@/repositories/actionTokenRepository");
    const tokenRepo = new ActionTokenRepository();
    const tokenData = await tokenRepo.findByToken(token);

    if (!tokenData) throw new NotFoundError("Invalid approval link.");
    if (tokenData.revokedAt) throw new ForbiddenError("This approval link has been revoked.");
    if (tokenData.expiresAt < new Date()) throw new ValidationError("This approval link has expired.");
    if (tokenData.usedAt) throw new ValidationError("This approval link has already been used.");
    if (tokenData.documentId !== id) throw new ForbiddenError("Token does not match this CAR.");
    if (tokenData.module !== "CAR") throw new ForbiddenError("Token module is invalid.");
    if (tokenData.role !== "APPROVER_MR") throw new ForbiddenError("Token role is invalid for this action.");

    const car = await this.carRepo.findForReviewResponse(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "RESPONDED") throw new ValidationError("CAR must be in RESPONDED status for MR review.");

    const nextStatus: CarStatus = input.action === "APPROVED" ? "VERIFY_1" : "ISSUED";
    const deptEmails = car.targetEmailGroups ?? [];
    const emailCc = car.targetEmailGroupsCc ?? [];
    const qmsEmail = input.action === "APPROVED" ? await this.configRepo.findValueByKey("CURRENT_QMS_EMAIL") : null;
    const approvedRecipients = [...deptEmails, ...(qmsEmail ? [qmsEmail] : [])];
    const mrSnapshot = await this.getIdentitySnapshot(tokenData.issuedTo);

    await db.$transaction(async (tx) => {
      await this.carRepo.createMrResponseReviewAndUseToken(
        id,
        token,
        tokenData.issuedTo,
        {
          mrAuthUserId: mrSnapshot?.authUserId ?? null,
          mrUserName: mrSnapshot?.name ?? null,
          mrEmployeeId: mrSnapshot?.employeeId ?? null,
        },
        input.action,
        input.comment,
        nextStatus,
        tx
      );

      const notifType = input.action === "APPROVED" ? "PLAN_APPROVED" : "PLAN_REJECTED";
      const notifRecipients = input.action === "APPROVED" ? approvedRecipients : deptEmails;
      for (const r of notifRecipients) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: notifType, recipient: r }, tx);
      }

      await AuditService.record({
        actorUserId: tokenData.issuedTo,
        actorRole: "MR",
        action: input.action === "APPROVED" ? "APPROVE" : "REJECT",
        resourceType: "CAR",
        resourceId: id,
        before: { status: "RESPONDED" },
        after: { status: nextStatus, action: input.action },
      }, tx);
    });

    // Send emails after transaction committed (non-blocking)
    if (input.action === "APPROVED" && approvedRecipients.length > 0) {
      sendCarPlanApprovedEmail({ carId: id, carNo: car.carNo, recipients: approvedRecipients, cc: emailCc }).catch((err) =>
        logger.error("[CarService.reviewResponseByMR] Approved email failed", err)
      );
    } else if (input.action === "REJECTED" && deptEmails.length > 0) {
      for (const email of deptEmails) {
        sendCarPlanRejectedEmail({ carId: id, carNo: car.carNo, targetEmail: email, comment: input.comment, cc: emailCc }).catch((err) =>
          logger.error("[CarService.reviewResponseByMR] Rejected email failed", err)
        );
      }
    }
    // In-app notifications
    const event = input.action === "APPROVED" ? "PLAN_APPROVED" : "PLAN_REJECTED" as const;
    const notifTargets = [car.issuerAuthUserId, car.response?.responderAuthUserId].filter(Boolean) as string[];
    for (const uid of [...new Set(notifTargets)]) {
      notifyCarUser({ recipientAuthUserId: uid, event, carNo: car.carNo, carId: id });
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async reviewResponseByMRAuthenticated(
    id: string,
    mrUserId: string,
    input: Omit<CarReviewResponseInput, "token">,
    mrAuthUserId?: string | null,
    accessToken?: string | null,
  ): Promise<CarDetail> {
    const car = await this.carRepo.findForReviewResponse(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "RESPONDED") throw new ValidationError("CAR must be in RESPONDED status for MR review.");

    const nextStatus: CarStatus = input.action === "APPROVED" ? "VERIFY_1" : "ISSUED";
    const deptEmails = car.targetEmailGroups ?? [];
    const emailCc = car.targetEmailGroupsCc ?? [];
    const qmsEmail = input.action === "APPROVED" ? await this.configRepo.findValueByKey("CURRENT_QMS_EMAIL") : null;
    const approvedRecipients = [...deptEmails, ...(qmsEmail ? [qmsEmail] : [])];
    const mrSnapshot = mrAuthUserId ? await this.getIdentitySnapshot(mrAuthUserId) : null;

    await db.$transaction(async (tx) => {
      await this.carRepo.createMrResponseReview(
        id,
        mrUserId,
        {
          mrAuthUserId: mrAuthUserId ?? mrSnapshot?.authUserId ?? null,
          mrUserName: mrSnapshot?.name ?? null,
          mrEmployeeId: mrSnapshot?.employeeId ?? null,
        },
        input.action,
        input.comment,
        nextStatus,
        tx
      );

      const notifType = input.action === "APPROVED" ? "PLAN_APPROVED" : "PLAN_REJECTED";
      const notifRecipients = input.action === "APPROVED" ? approvedRecipients : deptEmails;
      for (const r of notifRecipients) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: notifType, recipient: r }, tx);
      }

      await AuditService.record({
        actorUserId: mrUserId,
        actorAuthUserId: mrAuthUserId,
        actorRole: "MR",
        action: input.action === "APPROVED" ? "APPROVE" : "REJECT",
        resourceType: "CAR",
        resourceId: id,
        before: { status: "RESPONDED" },
        after: { status: nextStatus, action: input.action },
      }, tx);
    });

    if (input.action === "APPROVED" && approvedRecipients.length > 0) {
      sendCarPlanApprovedEmail({ carId: id, carNo: car.carNo, recipients: approvedRecipients, cc: emailCc, senderAccessToken: accessToken }).catch((err) =>
        logger.error("[CarService.reviewResponseByMRAuthenticated] Approved email failed", err)
      );
    } else if (input.action === "REJECTED" && deptEmails.length > 0) {
      for (const email of deptEmails) {
        sendCarPlanRejectedEmail({ carId: id, carNo: car.carNo, targetEmail: email, comment: input.comment, cc: emailCc, senderAccessToken: accessToken }).catch((err) =>
          logger.error("[CarService.reviewResponseByMRAuthenticated] Rejected email failed", err)
        );
      }
    }

    const event = input.action === "APPROVED" ? "PLAN_APPROVED" : "PLAN_REJECTED" as const;
    const notifTargets = [car.issuerAuthUserId, car.response?.responderAuthUserId].filter(Boolean) as string[];
    for (const uid of [...new Set(notifTargets)]) {
      notifyCarUser({ recipientAuthUserId: uid, event, carNo: car.carNo, carId: id });
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async verifyCar(
    id: string,
    verifierId: string,
    input: CarVerifyInput,
    verifierAuthUserId?: string | null,
    accessToken?: string | null,
  ): Promise<CarDetail> {
    const car = await this.carRepo.findForVerify(id);
    if (!car) throw new NotFoundError("CAR");

    const expectedStatus: CarStatus = input.round === 1 ? "VERIFY_1" : "VERIFY_2";
    if (car.status !== expectedStatus) {
      throw new ValidationError(`CAR status must be ${expectedStatus} for verification round ${input.round}.`);
    }

    let nextStatus: CarStatus;
    if (input.result === "PASSED") {
      nextStatus = "CLOSED";
    } else if (input.round === 1) {
      nextStatus = "VERIFY_2";
    } else {
      nextStatus = "RE_CAR";
    }

    let actionTokenValue: string | null = null;
    const [mrEmail, mrUserForVerify] = await Promise.all([
      input.result === "PASSED" ? this.configRepo.findValueByKey("CURRENT_MR_EMAIL") : Promise.resolve(null),
      input.result === "PASSED" ? this.resolveMrUser() : Promise.resolve(null),
    ]);
    const deptEmails = (input.result === "FAILED" && input.round === 1)
      ? (car.targetEmailGroups ?? [])
      : [];
    const emailCc = car.targetEmailGroupsCc ?? [];
    const verifierSnapshot = await this.getIdentitySnapshot(verifierId);
    if (!verifierSnapshot) throw new ValidationError("Verifier not found");

    await db.$transaction(async (tx) => {
      await this.carRepo.createVerificationAndSetStatus(
        id,
        input,
        verifierId,
        {
          verifierAuthUserId: verifierAuthUserId ?? verifierSnapshot.authUserId,
          verifierName: verifierSnapshot.name,
          verifierEmployeeId: verifierSnapshot.employeeId,
        },
        nextStatus,
        tx
      );

      if (input.result === "PASSED") {
        if (mrUserForVerify) {
          actionTokenValue = await ActionTokenService.issue({
            module: "CAR",
            documentId: id,
            role: "APPROVER_MR",
            issuedTo: mrUserForVerify.authUserId,
          });
        }
        if (mrEmail) {
          await this.carRepo.createNotificationLog({ carMasterId: id, type: "VERIFY_1_PASS", recipient: mrEmail }, tx);
        }
      } else if (input.result === "FAILED" && input.round === 1 && deptEmails.length > 0) {
        for (const email of deptEmails) {
          await this.carRepo.createNotificationLog({ carMasterId: id, type: "VERIFY_2_NOTIFY", recipient: email }, tx);
        }
      }

      await AuditService.record({
        actorUserId: verifierId,
        actorAuthUserId: verifierAuthUserId,
        actorRole: "QMS",
        action: input.round === 1 ? "VERIFY_1" : "VERIFY_2",
        resourceType: "CAR",
        resourceId: id,
        before: { status: expectedStatus },
        after: { status: nextStatus, result: input.result },
      }, tx);
    });

    // Send emails after transaction committed (non-blocking)
    const mrVerifySnapshot = mrUserForVerify ? await this.getIdentitySnapshot(mrUserForVerify.authUserId) : null;
    if (input.result === "PASSED" && actionTokenValue && mrEmail && canReceiveEmail(mrVerifySnapshot?.m365Linked)) {
      sendCarVerifyPassEmail({ carId: id, carNo: car.carNo, mrEmail, token: actionTokenValue, senderAccessToken: accessToken }).catch((err) =>
        logger.error("[CarService.verifyCar] MR email failed", err)
      );
    } else if (input.result === "FAILED" && input.round === 1 && deptEmails.length > 0) {
      for (const email of deptEmails) {
        sendCarVerify2NotifyEmail({ carId: id, carNo: car.carNo, targetEmail: email, nextDueDate: input.nextDueDate!, cc: emailCc, senderAccessToken: accessToken }).catch((err) =>
          logger.error("[CarService.verifyCar] Verify2 email failed", err)
        );
      }
    }
    // In-app notifications
    if (input.result === "PASSED" && mrUserForVerify) {
      notifyCarUser({ recipientAuthUserId: mrUserForVerify.authUserId, event: "VERIFY_1_PASS", carNo: car.carNo, carId: id });
    } else if (input.result === "FAILED" && input.round === 1 && car.issuerAuthUserId) {
      notifyCarUser({ recipientAuthUserId: car.issuerAuthUserId, event: "VERIFY_2_SCHEDULED", carNo: car.carNo, carId: id });
    }
    if (car.issuerAuthUserId && input.result === "PASSED") {
      notifyCarUser({ recipientAuthUserId: car.issuerAuthUserId, event: "CLOSED", carNo: car.carNo, carId: id });
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async closeCar(id: string, token: string, comment: string | null | undefined): Promise<CarDetail> {
    const { ActionTokenRepository } = await import("@/repositories/actionTokenRepository");
    const tokenRepo = new ActionTokenRepository();
    const tokenData = await tokenRepo.findByToken(token);

    if (!tokenData) throw new NotFoundError("Invalid approval link.");
    if (tokenData.revokedAt) throw new ForbiddenError("This approval link has been revoked.");
    if (tokenData.expiresAt < new Date()) throw new ValidationError("This approval link has expired.");
    if (tokenData.usedAt) throw new ValidationError("This approval link has already been used.");
    if (tokenData.documentId !== id) throw new ForbiddenError("Token does not match this CAR.");
    if (tokenData.module !== "CAR") throw new ForbiddenError("Token module is invalid.");

    const car = await this.carRepo.findForClose(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "CLOSED") throw new ValidationError("CAR is not ready for MR sign-off.");
    const mrSnapshot = await this.getIdentitySnapshot(tokenData.issuedTo);

    await db.$transaction(async (tx) => {
      await this.carRepo.createMrSignatureAndUseToken(
        id,
        token,
        tokenData.issuedTo,
        {
          mrAuthUserId: mrSnapshot?.authUserId ?? null,
          mrUserName: mrSnapshot?.name ?? null,
          mrEmployeeId: mrSnapshot?.employeeId ?? null,
        },
        comment,
        tx
      );

      await AuditService.record({
        actorUserId: tokenData.issuedTo,
        actorRole: "MR",
        action: "CLOSE",
        resourceType: "CAR",
        resourceId: id,
        after: { status: "CLOSED", mrSigned: true },
      }, tx);
    });

    // In-app notification for issuer
    if (car.issuerAuthUserId) {
      notifyCarUser({ recipientAuthUserId: car.issuerAuthUserId, event: "CLOSED", carNo: car.carNo, carId: id });
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async closeCarAuthenticated(
    id: string,
    mrUserId: string,
    comment: string | null | undefined,
    mrAuthUserId?: string | null,
  ): Promise<CarDetail> {
    const car = await this.carRepo.findForClose(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "CLOSED") throw new ValidationError("CAR is not ready for MR sign-off.");

    const mrSnapshot = mrAuthUserId ? await this.getIdentitySnapshot(mrAuthUserId) : null;

    await db.$transaction(async (tx) => {
      await this.carRepo.createMrSignature(
        id,
        mrUserId,
        {
          mrAuthUserId: mrAuthUserId ?? mrSnapshot?.authUserId ?? null,
          mrUserName: mrSnapshot?.name ?? null,
          mrEmployeeId: mrSnapshot?.employeeId ?? null,
        },
        comment,
        tx
      );

      await AuditService.record({
        actorUserId: mrUserId,
        actorAuthUserId: mrAuthUserId,
        actorRole: "MR",
        action: "CLOSE",
        resourceType: "CAR",
        resourceId: id,
        after: { status: "CLOSED", mrSigned: true },
      }, tx);
    });

    if (car.issuerAuthUserId) {
      notifyCarUser({ recipientAuthUserId: car.issuerAuthUserId, event: "CLOSED", carNo: car.carNo, carId: id });
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async createReCar(originalId: string, actorId: string, actorAuthUserId?: string | null, accessToken?: string | null): Promise<{ newCarId: string; newCarNo: string }> {
    const original = await this.carRepo.findDetailById(originalId);
    if (!original) throw new NotFoundError("CAR");
    if (original.status !== "RE_CAR") throw new ValidationError("CAR must be in RE_CAR status before creating a Re-CAR.");
    const actorSnapshot = await this.getIdentitySnapshot(actorId);
    if (!actorSnapshot) throw new ValidationError("Actor not found");

    const year = new Date().getFullYear();
    const emailTargets = original.targetEmailGroups ?? [];
    const emailCc = original.targetEmailGroupsCc ?? [];

    const { newId, newCarNo } = await db.$transaction(async (tx) => {
      const seq = await this.seqRepo.nextSequence(year, tx);
      const carNo = this.buildCarNo(year, seq);
      const issuedAt = new Date();
      const responseDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const newCar = await this.carRepo.createReCarFromOriginal(
        {
          id: original.id,
          sourceType: original.sourceType,
          sourceDetail: original.sourceDetail,
          isoStandards: original.isoStandards,
          defectDetail: original.defectDetail,
          nonConformanceRef: original.nonConformanceRef,
          issuerName: original.issuerName ?? null,
          issuerEmployeeId: original.issuerEmployeeId ?? null,
          issuerPosition: original.issuerPosition,
          targetDepartmentId: original.targetDepartmentId,
          targetAuthDepartmentId: (original as Record<string, unknown>).targetAuthDepartmentId as string | null | undefined,
          targetDepartmentName: original.targetDepartmentName ?? null,
          targetEmailGroups: original.targetEmailGroups,
          targetEmailGroupsCc: original.targetEmailGroupsCc ?? [],
        },
        {
          carNo,
          carYear: year,
          sequenceNo: seq,
          actorId,
          actorAuthUserId: actorAuthUserId ?? actorSnapshot.authUserId,
          actorName: actorSnapshot.name,
          actorEmployeeId: actorSnapshot.employeeId,
          issuedAt,
          responseDueAt,
        },
        tx
      );

      for (const email of emailTargets) {
        await this.carRepo.createNotificationLog({ carMasterId: newCar.id, type: "RE_CAR", recipient: email }, tx);
      }

      await AuditService.record({
        actorUserId: actorId,
        actorAuthUserId: actorAuthUserId,
        actorRole: "QMS",
        action: "RE_CAR",
        resourceType: "CAR",
        resourceId: newCar.id,
        metadata: { originalCarId: originalId, originalCarNo: original.carNo },
      }, tx);

      return { newId: newCar.id, newCarNo: carNo };
    });

    // Send email after transaction committed (non-blocking)
    for (const email of emailTargets) {
      sendCarReCarEmail({ carId: newId, carNo: newCarNo, targetEmail: email, originalCarNo: original.carNo, cc: emailCc, senderAccessToken: accessToken }).catch((err) =>
        logger.error("[CarService.createReCar] Email failed", err)
      );
    }

    return { newCarId: newId, newCarNo };
  }

  async previewNextCarNo(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.seqRepo.previewNext(year);
    return this.buildCarNo(year, seq);
  }

  async sendReminder(carId: string, accessToken?: string | null): Promise<void> {
    const car = await this.carRepo.findForIssue(carId);
    if (!car || car.status !== "ISSUED") return;

    const emailTargets = car.targetEmailGroups ?? [];
    const emailCc = car.targetEmailGroupsCc ?? [];
    if (emailTargets.length === 0) return;

    for (const email of emailTargets) {
      sendCarReminderEmail({ carId, carNo: car.carNo, targetEmail: email, cc: emailCc, senderAccessToken: accessToken }).catch((err) =>
        logger.error("[CarService.sendReminder] Email failed", err)
      );
      await this.carRepo.createNotificationLog({ carMasterId: carId, type: "REMINDER", recipient: email });
    }
  }
}
