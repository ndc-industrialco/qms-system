import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AuditService } from "@/services/auditService";
import { CarRepository } from "@/repositories/carRepository";
import { CarSequenceRepository } from "@/repositories/carSequenceRepository";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { ActionTokenService } from "@/services/actionTokenService";
import { NotFoundError, ValidationError, ForbiddenError } from "@/errors/customErrors";
import type { CarCreateInput, CarUpdateInput, CarRespondInput, CarVerifyInput, CarReviewResponseInput, CarListQuery } from "@/lib/validations/car";
import type { CarStatus, CarSourceType, VerificationResult } from "@/generated/prisma/client";
import { sendCarIssuedEmail, sendCarReminderEmail, sendCarRespondedEmail, sendCarMrReviewRequestEmail, sendCarPlanApprovedEmail, sendCarPlanRejectedEmail, sendCarVerifyPassEmail, sendCarVerify2NotifyEmail, sendCarReCarEmail } from "@/services/carEmailService";
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
  issuer: { id: string; name: string | null; employeeId: string | null; department: { id: string; name: string } | null };
  targetDepartment: { id: string; name: string; emailGroup: string | null };
  targetEmailGroup: string | null;
  response: CarResponseDetail | null;
  verifications: CarVerificationDetail[];
  mrSignature: CarMrSignatureDetail | null;
  mrResponseReview: CarMrResponseReviewDetail | null;
};

export type CarResponseDetail = {
  id: string;
  responderId: string;
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
  responder: { id: string; name: string | null; employeeId: string | null };
  attachments: CarAttachmentRow[];
};

export type CarVerificationDetail = {
  id: string;
  round: number;
  verifierId: string;
  verifierPosition: string;
  verifiedAt: string;
  findings: string;
  result: VerificationResult;
  nextDueDate: string | null;
  verifier: { id: string; name: string | null; employeeId: string | null };
};

export type CarMrSignatureDetail = {
  id: string;
  mrUserId: string;
  signedAt: string;
  comment: string | null;
  mrUser: { id: string; name: string | null; employeeId: string | null };
};

export type CarMrResponseReviewDetail = {
  id: string;
  mrUserId: string;
  reviewedAt: string;
  action: "APPROVED" | "REJECTED";
  comment: string | null;
  mrUser: { id: string; name: string | null; employeeId: string | null };
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
  issuer: { id: string; name: string | null };
  targetDepartment: { id: string; name: string };
  verificationCount: number;
};

export class CarService {
  private carRepo = new CarRepository();
  private seqRepo = new CarSequenceRepository();
  private configRepo = new SystemConfigRepository();

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
      issuer: raw.issuer,
      targetDepartment: raw.targetDepartment,
      targetEmailGroup: raw.targetEmailGroup,
      response: raw.response
        ? {
            id: raw.response.id,
            responderId: raw.response.responderId,
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
            responder: raw.response.responder,
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
              uploadedBy: a.uploadedBy,
            })),
          }
        : null,
      verifications: raw.verifications.map((v) => ({
        id: v.id,
        round: v.round,
        verifierId: v.verifierId,
        verifierPosition: v.verifierPosition,
        verifiedAt: v.verifiedAt.toISOString(),
        findings: v.findings,
        result: v.result as VerificationResult,
        nextDueDate: v.nextDueDate?.toISOString() ?? null,
        verifier: v.verifier,
      })),
      mrSignature: raw.mrSignature
        ? {
            id: raw.mrSignature.id,
            mrUserId: raw.mrSignature.mrUserId,
            signedAt: raw.mrSignature.signedAt.toISOString(),
            comment: raw.mrSignature.comment,
            mrUser: raw.mrSignature.mrUser,
          }
        : null,
      mrResponseReview: raw.mrResponseReview
        ? {
            id: raw.mrResponseReview.id,
            mrUserId: raw.mrResponseReview.mrUserId,
            reviewedAt: raw.mrResponseReview.reviewedAt.toISOString(),
            action: raw.mrResponseReview.action as "APPROVED" | "REJECTED",
            comment: raw.mrResponseReview.comment,
            mrUser: raw.mrResponseReview.mrUser,
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

  async listCars(query: CarListQuery, scope: { departmentId?: string }): Promise<PaginatedResult<CarSummary>> {
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
      issuer: r.issuer,
      targetDepartment: r.targetDepartment,
      verificationCount: r._count.verifications,
    }));
  }

  async getCarById(id: string): Promise<CarDetail> {
    const raw = await this.carRepo.findDetailById(id);
    if (!raw) throw new NotFoundError("CAR");
    return this.mapDetail(raw);
  }

  async createCar(issuerId: string, input: CarCreateInput): Promise<CarDetail> {
    const year = new Date().getFullYear();

    const id = await db.$transaction(async (tx) => {
      if (input.reCarRefId) {
        const refCar = await this.carRepo.findById(input.reCarRefId, tx);
        if (!refCar) {
          throw new ValidationError("CAR ที่อ้างอิง (reCarRefId) ไม่มีอยู่ในระบบ");
        }
      }

      const seq = await this.seqRepo.nextSequence(year, tx);
      const carNo = this.buildCarNo(year, seq);

      const car = await this.carRepo.createDraft({ ...input, issuerId, carNo, carYear: year, sequenceNo: seq }, tx);

      await AuditService.record({
        actorUserId: issuerId,
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
    const existing = await this.carRepo.findById(id);
    if (!existing) throw new NotFoundError("CAR");
    if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT CAR records can be updated.");

    if (input.reCarRefId) {
      const refCar = await this.carRepo.findById(input.reCarRefId);
      if (!refCar) {
        throw new ValidationError("CAR ที่อ้างอิง (reCarRefId) ไม่มีอยู่ในระบบ");
      }
    }

    await this.carRepo.updateDraft(id, input);

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async cancelCar(id: string, actorId: string): Promise<void> {
    const existing = await this.carRepo.findById(id);
    if (!existing) throw new NotFoundError("CAR");
    if (existing.status === "CLOSED") throw new ValidationError("Cannot cancel a closed CAR.");

    await db.$transaction(async (tx) => {
      await this.carRepo.updateStatus(id, "CANCELLED", tx);
      await AuditService.record({
        actorUserId: actorId,
        actorRole: "QMS",
        action: "DELETE",
        resourceType: "CAR",
        resourceId: id,
        before: { status: existing.status },
        after: { status: "CANCELLED" },
      }, tx);
    });
  }

  async issueCar(id: string, actorId: string): Promise<CarDetail> {
    const car = await this.carRepo.findForIssue(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "DRAFT") throw new ValidationError("Only DRAFT CAR records can be issued.");

    const now = new Date();
    const responseDueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const emailTarget = car.targetEmailGroup ?? car.targetDepartment.emailGroup ?? null;

    await db.$transaction(async (tx) => {
      await this.carRepo.issue(id, now, responseDueAt, tx);

      if (emailTarget) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: "ISSUED", recipient: emailTarget }, tx);
      }

      await AuditService.record({
        actorUserId: actorId,
        actorRole: "QMS",
        action: "ISSUE",
        resourceType: "CAR",
        resourceId: id,
        before: { status: "DRAFT" },
        after: { status: "ISSUED", issuedAt: now.toISOString() },
      }, tx);
    });

    // Send email after transaction committed (non-blocking)
    if (emailTarget) {
      sendCarIssuedEmail({ carId: id, carNo: car.carNo, targetEmail: emailTarget }).catch((err) =>
        logger.error("[CarService.issueCar] Email failed", err)
      );
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async respondToCar(
    id: string,
    responderId: string,
    responderDepartmentId: string | null | undefined,
    input: CarRespondInput
  ): Promise<CarDetail> {
    const car = await this.carRepo.findForRespond(id);
    if (!car) throw new NotFoundError("CAR");
    if (car.status !== "ISSUED") throw new ValidationError("Only ISSUED CAR records can be responded to.");
    if (responderDepartmentId !== car.targetDepartmentId) throw new ForbiddenError("You do not have permission to respond to this CAR.");

    const mrEmail = await this.configRepo.findValueByKey("CURRENT_MR_EMAIL");
    const mrUserId = await this.configRepo.findValueByKey("CURRENT_MR_USER_ID");
    const qmsEmail = await this.configRepo.findValueByKey("CURRENT_QMS_EMAIL");
    const infoRecipients = [qmsEmail].filter(Boolean) as string[];
    const plannedDate = input.plannedCompletionDate;

    let mrReviewToken: string | null = null;

    await db.$transaction(async (tx) => {
      await this.carRepo.createResponseAndSetStatus(id, responderId, input, tx);

      // Issue ActionToken for MR to review the response plan
      if (mrUserId) {
        mrReviewToken = await ActionTokenService.issue({
          module: "CAR",
          documentId: id,
          role: "APPROVER_MR",
          issuedTo: mrUserId,
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
        actorRole: "USER",
        action: "RESPOND",
        resourceType: "CAR",
        resourceId: id,
        before: { status: "ISSUED" },
        after: { status: "RESPONDED" },
      }, tx);
    });

    // Send emails after transaction committed (non-blocking)
    if (mrEmail && mrReviewToken) {
      sendCarMrReviewRequestEmail({
        carId: id,
        carNo: car.carNo,
        mrEmail,
        token: mrReviewToken,
        plannedCompletionDate: plannedDate,
      }).catch((err) => logger.error("[CarService.respondToCar] MR review email failed", err));
    }
    if (infoRecipients.length > 0) {
      sendCarRespondedEmail({ carId: id, carNo: car.carNo, recipients: infoRecipients }).catch((err) =>
        logger.error("[CarService.respondToCar] QMS email failed", err)
      );
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async reviewResponseByMR(id: string, input: CarReviewResponseInput): Promise<CarDetail> {
    const { ActionTokenRepository } = await import("@/repositories/actionTokenRepository");
    const tokenRepo = new ActionTokenRepository();
    const tokenData = await tokenRepo.findByToken(input.token);

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
    const deptEmail = car.targetEmailGroup ?? car.targetDepartment?.emailGroup ?? null;
    const qmsEmail = input.action === "APPROVED" ? await this.configRepo.findValueByKey("CURRENT_QMS_EMAIL") : null;
    const approvedRecipients = [deptEmail, qmsEmail].filter(Boolean) as string[];

    await db.$transaction(async (tx) => {
      await this.carRepo.createMrResponseReviewAndUseToken(
        id,
        input.token,
        tokenData.issuedTo,
        input.action,
        input.comment,
        nextStatus,
        tx
      );

      const notifType = input.action === "APPROVED" ? "PLAN_APPROVED" : "PLAN_REJECTED";
      const notifRecipients = input.action === "APPROVED" ? approvedRecipients : (deptEmail ? [deptEmail] : []);
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
      sendCarPlanApprovedEmail({ carId: id, carNo: car.carNo, recipients: approvedRecipients }).catch((err) =>
        logger.error("[CarService.reviewResponseByMR] Approved email failed", err)
      );
    } else if (input.action === "REJECTED" && deptEmail) {
      sendCarPlanRejectedEmail({ carId: id, carNo: car.carNo, targetEmail: deptEmail, comment: input.comment }).catch((err) =>
        logger.error("[CarService.reviewResponseByMR] Rejected email failed", err)
      );
    }

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async verifyCar(
    id: string,
    verifierId: string,
    input: CarVerifyInput
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
    const mrEmail = input.result === "PASSED" ? await this.configRepo.findValueByKey("CURRENT_MR_EMAIL") : null;
    const deptEmail = (input.result === "FAILED" && input.round === 1)
      ? (car.targetEmailGroup ?? car.targetDepartment?.emailGroup ?? null)
      : null;

    await db.$transaction(async (tx) => {
      await this.carRepo.createVerificationAndSetStatus(id, input, verifierId, nextStatus, tx);

      if (input.result === "PASSED") {
        const mrUserId = await this.configRepo.findValueByKey("CURRENT_MR_USER_ID", tx);
        if (mrUserId) {
          actionTokenValue = await ActionTokenService.issue({
            module: "CAR",
            documentId: id,
            role: "APPROVER_MR",
            issuedTo: mrUserId,
          });
        }
        if (mrEmail) {
          await this.carRepo.createNotificationLog({ carMasterId: id, type: "VERIFY_1_PASS", recipient: mrEmail }, tx);
        }
      } else if (input.result === "FAILED" && input.round === 1 && deptEmail) {
        await this.carRepo.createNotificationLog({ carMasterId: id, type: "VERIFY_2_NOTIFY", recipient: deptEmail }, tx);
      }

      await AuditService.record({
        actorUserId: verifierId,
        actorRole: "QMS",
        action: input.round === 1 ? "VERIFY_1" : "VERIFY_2",
        resourceType: "CAR",
        resourceId: id,
        before: { status: expectedStatus },
        after: { status: nextStatus, result: input.result },
      }, tx);
    });

    // Send emails after transaction committed (non-blocking)
    if (input.result === "PASSED" && actionTokenValue && mrEmail) {
      sendCarVerifyPassEmail({ carId: id, carNo: car.carNo, mrEmail, token: actionTokenValue }).catch((err) =>
        logger.error("[CarService.verifyCar] MR email failed", err)
      );
    } else if (input.result === "FAILED" && input.round === 1 && deptEmail) {
      sendCarVerify2NotifyEmail({ carId: id, carNo: car.carNo, targetEmail: deptEmail, nextDueDate: input.nextDueDate! }).catch((err) =>
        logger.error("[CarService.verifyCar] Verify2 email failed", err)
      );
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

    await db.$transaction(async (tx) => {
      await this.carRepo.createMrSignatureAndUseToken(id, token, tokenData.issuedTo, comment, tx);

      await AuditService.record({
        actorUserId: tokenData.issuedTo,
        actorRole: "MR",
        action: "CLOSE",
        resourceType: "CAR",
        resourceId: id,
        after: { status: "CLOSED", mrSigned: true },
      }, tx);
    });

    const detail = await this.carRepo.findDetailById(id);
    if (!detail) throw new NotFoundError("CAR");
    return this.mapDetail(detail);
  }

  async createReCar(originalId: string, actorId: string): Promise<{ newCarId: string; newCarNo: string }> {
    const original = await this.carRepo.findDetailById(originalId);
    if (!original) throw new NotFoundError("CAR");
    if (original.status !== "RE_CAR") throw new ValidationError("CAR must be in RE_CAR status before creating a Re-CAR.");

    const year = new Date().getFullYear();
    const emailTarget = original.targetEmailGroup ?? original.targetDepartment.emailGroup ?? null;

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
          issuerPosition: original.issuerPosition,
          targetDepartmentId: original.targetDepartmentId,
          targetEmailGroup: original.targetEmailGroup,
        },
        { carNo, carYear: year, sequenceNo: seq, actorId, issuedAt, responseDueAt },
        tx
      );

      if (emailTarget) {
        await this.carRepo.createNotificationLog({ carMasterId: newCar.id, type: "RE_CAR", recipient: emailTarget }, tx);
      }

      await AuditService.record({
        actorUserId: actorId,
        actorRole: "QMS",
        action: "RE_CAR",
        resourceType: "CAR",
        resourceId: newCar.id,
        metadata: { originalCarId: originalId, originalCarNo: original.carNo },
      }, tx);

      return { newId: newCar.id, newCarNo: carNo };
    });

    // Send email after transaction committed (non-blocking)
    if (emailTarget) {
      sendCarReCarEmail({ carId: newId, carNo: newCarNo, targetEmail: emailTarget, originalCarNo: original.carNo }).catch((err) =>
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

  async sendReminder(carId: string): Promise<void> {
    const car = await this.carRepo.findForIssue(carId);
    if (!car || car.status !== "ISSUED") return;

    const emailTarget = car.targetEmailGroup ?? car.targetDepartment.emailGroup ?? null;
    if (!emailTarget) return;

    sendCarReminderEmail({ carId, carNo: car.carNo, targetEmail: emailTarget }).catch((err) =>
      logger.error("[CarService.sendReminder] Email failed", err)
    );
    await this.carRepo.createNotificationLog({ carMasterId: carId, type: "REMINDER", recipient: emailTarget });
  }
}
