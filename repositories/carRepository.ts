import { BaseRepository, PaginatedResult } from "./baseRepository";
import { CarMaster, Prisma, type CarStatus } from "@/generated/prisma/client";
import type { CarCreateInput, CarRespondInput, CarUpdateInput, CarVerifyInput } from "@/lib/validations/car";
import type { CarListQuery } from "@/types/car";
import { ConflictError } from "@/errors/customErrors";

export class CarRepository extends BaseRepository<CarMaster> {
  constructor() {
    super("carMaster");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).carMaster;
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        carNo: true,
        carYear: true,
        sequenceNo: true,
        status: true,
        sourceType: true,
        sourceDetail: true,
        isoStandards: true,
        defectDetail: true,
        nonConformanceRef: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
        issuerEmployeeId: true,
        issuerPosition: true,
        issuedAt: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        targetEmailGroup: true,
        responseDueAt: true,
        reCar: true,
        reCarRefId: true,
        createdAt: true,
        updatedAt: true,
        reCarRef: { select: { id: true, carNo: true } },
        reCarChildren: { select: { id: true, carNo: true, status: true } },
        response: {
          select: {
            id: true,
            responderId: true,
            responderAuthUserId: true,
            responderName: true,
            responderEmployeeId: true,
            responderPosition: true,
            respondedAt: true,
            whyAnalysis: true,
            additionalToolDetail: true,
            rootCausePerson: true,
            rootCauseMaterial: true,
            rootCauseMachine: true,
            rootCauseMethod: true,
            rootCauseOther: true,
            rootCauseOtherDetail: true,
            rootCauseSummary: true,
            immediateAction: true,
            preventiveAction: true,
            plannedCompletionDate: true,
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                spItemId: true,
                spWebUrl: true,
                spDownloadUrl: true,
                folderPath: true,
                uploadedById: true,
                uploadedByName: true,
                createdAt: true,
              },
            },
          },
        },
        verifications: {
          orderBy: { round: "asc" },
          select: {
            id: true,
            round: true,
            verifierId: true,
            verifierAuthUserId: true,
            verifierName: true,
            verifierEmployeeId: true,
            verifierPosition: true,
            verifiedAt: true,
            findings: true,
            result: true,
            nextDueDate: true,
          },
        },
        mrSignature: {
          select: {
            id: true,
            mrUserId: true,
            mrAuthUserId: true,
            mrUserName: true,
            mrEmployeeId: true,
            signedAt: true,
            comment: true,
          },
        },
        mrResponseReview: {
          select: {
            id: true,
            mrUserId: true,
            mrAuthUserId: true,
            mrUserName: true,
            mrEmployeeId: true,
            reviewedAt: true,
            action: true,
            comment: true,
          },
        },
        notificationLogs: { orderBy: { sentAt: "desc" } },
      },
    });
  }

  async findManySummary(where: Prisma.CarMasterWhereInput = {}, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        carNo: true,
        carYear: true,
        status: true,
        sourceType: true,
        defectDetail: true,
        issuedAt: true,
        responseDueAt: true,
        createdAt: true,
        issuerId: true,
        issuerName: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        _count: { select: { verifications: true } },
      },
    });
  }

  async findManyByDepartment(departmentId: string, tx?: Prisma.TransactionClient) {
    return this.findManySummary({ targetDepartmentId: departmentId }, tx);
  }

  async paginateSummaries(
    query: CarListQuery,
    scope: { departmentId?: string; authDepartmentId?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<Awaited<ReturnType<CarRepository["findManySummary"]>>[number]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const deptFilter = scope.authDepartmentId
      ? { targetAuthDepartmentId: scope.authDepartmentId }
      : scope.departmentId
        ? { targetDepartmentId: scope.departmentId }
        : {};

    const where: Prisma.CarMasterWhereInput = {
      ...deptFilter,
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(search
        ? {
            OR: [
              { carNo: { contains: search, mode: "insensitive" } },
              { defectDetail: { contains: search, mode: "insensitive" } },
              { nonConformanceRef: { contains: search, mode: "insensitive" } },
              { targetDepartmentName: { contains: search, mode: "insensitive" } },
              { issuerName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.delegate(tx).findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { carNo: "desc" }],
        select: {
          id: true,
          carNo: true,
          carYear: true,
          status: true,
          sourceType: true,
          defectDetail: true,
          issuedAt: true,
          responseDueAt: true,
          createdAt: true,
          issuerId: true,
          issuerName: true,
          targetDepartmentId: true,
          targetAuthDepartmentId: true,
          targetDepartmentName: true,
          _count: { select: { verifications: true } },
        },
      }),
      this.delegate(tx).count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findForIssue(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        targetEmailGroup: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
        carNo: true,
      },
    });
  }

  async findForRespond(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
      },
    });
  }

  async findForVerify(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        targetDepartmentId: true,
        targetAuthDepartmentId: true,
        targetDepartmentName: true,
        issuerId: true,
        issuerAuthUserId: true,
        issuerName: true,
        targetEmailGroup: true,
      },
    });
  }

  async findForClose(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: { id: true, status: true, carNo: true },
    });
  }

  async findForReviewResponse(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        carNo: true,
        targetEmailGroup: true,
        targetDepartmentName: true,
        response: { select: { plannedCompletionDate: true } },
      },
    });
  }

  async createMrResponseReviewAndUseToken(
    carId: string,
    token: string,
    mrUserId: string,
    snapshot: { mrAuthUserId?: string | null; mrUserName?: string | null; mrEmployeeId?: string | null },
    action: "APPROVED" | "REJECTED",
    comment: string | null | undefined,
    nextStatus: import("@/generated/prisma/client").CarStatus,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carMrResponseReview.create({
      data: {
        carMasterId: carId,
        mrUserId,
        mrAuthUserId: snapshot.mrAuthUserId ?? null,
        mrUserName: snapshot.mrUserName ?? null,
        mrEmployeeId: snapshot.mrEmployeeId ?? null,
        action,
        comment: comment ?? null,
      },
    });

    await this.updateStatus(carId, nextStatus, tx);

    const result = await client.actionToken.updateMany({
      where: { token, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (result.count === 0) {
      throw new (await import("@/errors/customErrors")).ConflictError("This approval link has already been used by a concurrent request.");
    }
  }

  async createNotificationLog(data: { carMasterId: string; type: string; recipient: string }, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).carNotificationLog.create({ data });
  }

  async createDraft(
    data: CarCreateInput & {
      issuerId: string;
      issuerAuthUserId?: string | null;
      issuerName?: string | null;
      issuerEmployeeId?: string | null;
      targetAuthDepartmentId?: string | null;
      targetDepartmentName?: string | null;
      carNo: string;
      carYear: number;
      sequenceNo: number;
    },
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).create({
      data: {
        carNo: data.carNo,
        carYear: data.carYear,
        sequenceNo: data.sequenceNo,
        status: "DRAFT",
        sourceType: data.sourceType,
        sourceDetail: data.sourceDetail ?? null,
        isoStandards: data.isoStandards,
        defectDetail: data.defectDetail,
        nonConformanceRef: data.nonConformanceRef,
        issuerId: data.issuerId,
        issuerAuthUserId: data.issuerAuthUserId ?? null,
        issuerName: data.issuerName ?? null,
        issuerEmployeeId: data.issuerEmployeeId ?? null,
        issuerPosition: data.issuerPosition,
        targetDepartmentId: data.targetDepartmentId,
        targetAuthDepartmentId: data.targetAuthDepartmentId ?? null,
        targetDepartmentName: data.targetDepartmentName ?? null,
        targetEmailGroup: data.targetEmailGroup ?? null,
        reCar: data.reCar ?? false,
        reCarRefId: data.reCarRefId ?? null,
      },
    });
  }

  async updateDraft(
    id: string,
    input: CarUpdateInput,
    targetAuthDepartmentId?: string | null,
    targetDepartmentName?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).update({
      where: { id },
      data: {
        sourceType: input.sourceType,
        sourceDetail: input.sourceDetail ?? null,
        isoStandards: input.isoStandards,
        defectDetail: input.defectDetail,
        nonConformanceRef: input.nonConformanceRef,
        issuerPosition: input.issuerPosition,
        targetDepartmentId: input.targetDepartmentId,
        targetAuthDepartmentId: targetAuthDepartmentId ?? null,
        targetDepartmentName: targetDepartmentName ?? null,
        targetEmailGroup: input.targetEmailGroup ?? null,
        reCar: input.reCar ?? false,
        reCarRefId: input.reCarRefId ?? null,
      },
    });
  }

  async updateStatus(id: string, status: CarStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: { status },
    });
  }

  async issue(id: string, issuedAt: Date, responseDueAt: Date, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: { status: "ISSUED", issuedAt, responseDueAt },
    });
  }

  async createResponseAndSetStatus(
    id: string,
    responderId: string,
    snapshot: { responderAuthUserId?: string | null; responderName?: string | null; responderEmployeeId?: string | null },
    input: CarRespondInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carResponse.create({
      data: {
        carMasterId: id,
        responderId,
        responderAuthUserId: snapshot.responderAuthUserId ?? null,
        responderName: snapshot.responderName ?? null,
        responderEmployeeId: snapshot.responderEmployeeId ?? null,
        responderPosition: input.responderPosition,
        whyAnalysis: input.whyAnalysis,
        additionalToolDetail: input.additionalToolDetail ?? null,
        rootCausePerson: input.rootCausePerson,
        rootCauseMaterial: input.rootCauseMaterial,
        rootCauseMachine: input.rootCauseMachine,
        rootCauseMethod: input.rootCauseMethod,
        rootCauseOther: input.rootCauseOther,
        rootCauseOtherDetail: input.rootCauseOtherDetail ?? null,
        rootCauseSummary: input.rootCauseSummary,
        immediateAction: input.immediateAction,
        preventiveAction: input.preventiveAction,
        plannedCompletionDate: new Date(input.plannedCompletionDate),
      },
    });

    return this.updateStatus(id, "RESPONDED", tx);
  }

  async createVerificationAndSetStatus(
    id: string,
    input: CarVerifyInput,
    verifierId: string,
    snapshot: { verifierAuthUserId?: string | null; verifierName?: string | null; verifierEmployeeId?: string | null },
    nextStatus: CarStatus,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carVerification.create({
      data: {
        carMasterId: id,
        round: input.round,
        verifierId,
        verifierAuthUserId: snapshot.verifierAuthUserId ?? null,
        verifierName: snapshot.verifierName ?? null,
        verifierEmployeeId: snapshot.verifierEmployeeId ?? null,
        verifierPosition: input.verifierPosition,
        findings: input.findings,
        result: input.result,
        nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : null,
      },
    });

    return this.updateStatus(id, nextStatus, tx);
  }

  async createMrSignatureAndUseToken(
    carId: string,
    token: string,
    mrUserId: string,
    snapshot: { mrAuthUserId?: string | null; mrUserName?: string | null; mrEmployeeId?: string | null },
    comment: string | null | undefined,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carMrSignature.create({
      data: {
        carMasterId: carId,
        mrUserId,
        mrAuthUserId: snapshot.mrAuthUserId ?? null,
        mrUserName: snapshot.mrUserName ?? null,
        mrEmployeeId: snapshot.mrEmployeeId ?? null,
        comment: comment ?? null,
      },
    });

    const result = await client.actionToken.updateMany({
      where: { token, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (result.count === 0) {
      throw new ConflictError("This approval link has already been used by a concurrent request.");
    }
  }

  async createReCarFromOriginal(
    original: {
      id: string;
      sourceType: CarMaster["sourceType"];
      sourceDetail: string | null;
      isoStandards: string[];
      defectDetail: string;
      nonConformanceRef: string;
      issuerName: string | null;
      issuerEmployeeId: string | null;
      issuerPosition: string;
      targetDepartmentId: string;
      targetAuthDepartmentId?: string | null;
      targetDepartmentName?: string | null;
      targetEmailGroup: string | null;
    },
    data: {
      carNo: string;
      carYear: number;
      sequenceNo: number;
      actorId: string;
      actorAuthUserId?: string | null;
      actorName?: string | null;
      actorEmployeeId?: string | null;
      issuedAt: Date;
      responseDueAt: Date;
    },
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).create({
      data: {
        carNo: data.carNo,
        carYear: data.carYear,
        sequenceNo: data.sequenceNo,
        status: "ISSUED",
        sourceType: original.sourceType,
        sourceDetail: original.sourceDetail,
        isoStandards: original.isoStandards,
        defectDetail: original.defectDetail,
        nonConformanceRef: original.nonConformanceRef,
        issuerId: data.actorId,
        issuerAuthUserId: data.actorAuthUserId ?? null,
        issuerName: data.actorName ?? original.issuerName,
        issuerEmployeeId: data.actorEmployeeId ?? original.issuerEmployeeId,
        issuerPosition: original.issuerPosition,
        targetDepartmentId: original.targetDepartmentId,
        targetAuthDepartmentId: original.targetAuthDepartmentId ?? null,
        targetDepartmentName: original.targetDepartmentName ?? null,
        targetEmailGroup: original.targetEmailGroup,
        reCar: true,
        reCarRefId: original.id,
        issuedAt: data.issuedAt,
        responseDueAt: data.responseDueAt,
      },
    });
  }
}
