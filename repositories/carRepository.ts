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
      include: {
        issuer: { select: { id: true, name: true, employeeId: true, department: true } },
        targetDepartment: true,
        reCarRef: { select: { id: true, carNo: true } },
        reCarChildren: { select: { id: true, carNo: true, status: true } },
        response: {
          include: {
            responder: { select: { id: true, name: true, employeeId: true } },
            attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
          },
        },
        verifications: {
          orderBy: { round: "asc" },
          include: { verifier: { select: { id: true, name: true, employeeId: true } } },
        },
        mrSignature: {
          include: { mrUser: { select: { id: true, name: true, employeeId: true } } },
        },
        mrResponseReview: {
          include: { mrUser: { select: { id: true, name: true, employeeId: true } } },
        },
        notificationLogs: { orderBy: { sentAt: "desc" } },
      },
    });
  }

  async findManySummary(
    where: Prisma.CarMasterWhereInput = {},
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        issuer: { select: { id: true, name: true } },
        targetDepartment: { select: { id: true, name: true } },
        _count: { select: { verifications: true } },
      },
    });
  }

  async findManyByDepartment(
    departmentId: string,
    tx?: Prisma.TransactionClient
  ) {
    return this.findManySummary({ targetDepartmentId: departmentId }, tx);
  }

  async paginateSummaries(
    query: CarListQuery,
    scope: { departmentId?: string },
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<Awaited<ReturnType<CarRepository["findManySummary"]>>[number]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.CarMasterWhereInput = {
      ...(scope.departmentId ? { targetDepartmentId: scope.departmentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(search
        ? {
            OR: [
              { carNo: { contains: search, mode: "insensitive" } },
              { defectDetail: { contains: search, mode: "insensitive" } },
              { nonConformanceRef: { contains: search, mode: "insensitive" } },
              { targetDepartment: { name: { contains: search, mode: "insensitive" } } },
              { issuer: { name: { contains: search, mode: "insensitive" } } },
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
        include: {
          issuer: { select: { id: true, name: true } },
          targetDepartment: { select: { id: true, name: true } },
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
        id: true, status: true, targetEmailGroup: true, targetDepartmentId: true,
        issuerId: true, carNo: true,
        targetDepartment: { select: { name: true, emailGroup: true } },
      },
    });
  }

  async findForRespond(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true, status: true, carNo: true, targetDepartmentId: true, issuerId: true,
        issuer: { select: { email: true, name: true } },
      },
    });
  }

  async findForVerify(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true, status: true, carNo: true, targetDepartmentId: true, issuerId: true,
        targetEmailGroup: true,
        targetDepartment: { select: { emailGroup: true } },
        issuer: { select: { email: true, name: true } },
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
        id: true, status: true, carNo: true,
        targetEmailGroup: true,
        targetDepartment: { select: { emailGroup: true } },
        response: { select: { plannedCompletionDate: true } },
      },
    });
  }

  async createMrResponseReviewAndUseToken(
    carId: string,
    token: string,
    mrUserId: string,
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

  async createNotificationLog(
    data: { carMasterId: string; type: string; recipient: string },
    tx?: Prisma.TransactionClient
  ) {
    return this.getClient(tx).carNotificationLog.create({ data });
  }

  async createDraft(
    data: CarCreateInput & { issuerId: string; carNo: string; carYear: number; sequenceNo: number },
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
        issuerPosition: data.issuerPosition,
        targetDepartmentId: data.targetDepartmentId,
        targetEmailGroup: data.targetEmailGroup ?? null,
        reCar: data.reCar ?? false,
        reCarRefId: data.reCarRefId ?? null,
      },
    });
  }

  async updateDraft(id: string, input: CarUpdateInput, tx?: Prisma.TransactionClient) {
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
    input: CarRespondInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carResponse.create({
      data: {
        carMasterId: id,
        responderId,
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
    nextStatus: CarStatus,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carVerification.create({
      data: {
        carMasterId: id,
        round: input.round,
        verifierId,
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
    comment: string | null | undefined,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.carMrSignature.create({
      data: {
        carMasterId: carId,
        mrUserId,
        comment: comment ?? null,
      },
    });

    // Atomic: only mark used if not already used — prevents double-use under concurrent requests.
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
      issuerPosition: string;
      targetDepartmentId: string;
      targetEmailGroup: string | null;
    },
    data: { carNo: string; carYear: number; sequenceNo: number; actorId: string; issuedAt: Date; responseDueAt: Date },
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
        issuerPosition: original.issuerPosition,
        targetDepartmentId: original.targetDepartmentId,
        targetEmailGroup: original.targetEmailGroup,
        reCar: true,
        reCarRefId: original.id,
        issuedAt: data.issuedAt,
        responseDueAt: data.responseDueAt,
      },
    });
  }
}
