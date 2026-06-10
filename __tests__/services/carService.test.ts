import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
  },
}));

vi.mock("@/services/auditService", () => ({
  AuditService: { record: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/services/carEmailService", () => ({
  sendCarIssuedEmail: vi.fn().mockResolvedValue(undefined),
  sendCarReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendCarRespondedEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerifyPassEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerify2NotifyEmail: vi.fn().mockResolvedValue(undefined),
  sendCarReCarEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/actionTokenService", () => ({
  ActionTokenService: { issue: vi.fn().mockResolvedValue("token-1") },
}));

vi.mock("@/repositories/carRepository");
vi.mock("@/repositories/carSequenceRepository");
vi.mock("@/repositories/systemConfigRepository");

import { CarService } from "@/services/carService";
import { CarRepository } from "@/repositories/carRepository";

type MockClass<T> = { mock: { instances: T[] } };

function getInstance<T>(Cls: unknown): T {
  return (Cls as MockClass<T>).mock.instances[0];
}

function makeSummaryRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "car-1",
    carNo: "C26-001",
    carYear: 2026,
    status: "ISSUED",
    sourceType: "I",
    defectDetail: "Incorrect batch label",
    issuedAt: new Date("2026-06-01T00:00:00.000Z"),
    responseDueAt: new Date("2026-06-08T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    issuer: { id: "issuer-1", name: "Alice" },
    targetDepartment: { id: "dept-1", name: "QA" },
    _count: { verifications: 1 },
    ...overrides,
  };
}

function makeDetailRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "car-1",
    carNo: "C26-001",
    carYear: 2026,
    sequenceNo: 1,
    status: "ISSUED",
    sourceType: "I",
    sourceDetail: null,
    isoStandards: ["ISO 9001:2015"],
    defectDetail: "Incorrect batch label",
    nonConformanceRef: "NC-001",
    issuerPosition: "QMS Officer",
    issuedAt: new Date("2026-06-01T00:00:00.000Z"),
    responseDueAt: new Date("2026-06-08T00:00:00.000Z"),
    reCar: false,
    reCarRefId: null,
    reCarRef: null,
    reCarChildren: [],
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    issuer: { id: "issuer-1", name: "Alice", employeeId: "E001", department: { id: "dept-qms", name: "QMS" } },
    targetDepartment: { id: "dept-1", name: "QA", emailGroup: "qa@example.com" },
    targetEmailGroup: "qa@example.com",
    response: null,
    verifications: [],
    mrSignature: null,
    notificationLogs: [],
    ...overrides,
  };
}

describe("CarService", () => {
  let service: CarService;
  let carRepo: CarRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CarService();
    carRepo = getInstance<CarRepository>(CarRepository);
  });

  it("maps paginated car list results", async () => {
    vi.mocked(carRepo.paginateSummaries).mockResolvedValue({
      data: [makeSummaryRaw()],
      meta: { page: 2, limit: 20, total: 41 },
    } as never);

    const result = await service.listCars({ page: 2, limit: 20, search: "batch" }, {});

    expect(carRepo.paginateSummaries).toHaveBeenCalledWith(
      { page: 2, limit: 20, search: "batch" },
      {}
    );
    expect(result.meta).toEqual({ page: 2, limit: 20, total: 41 });
    expect(result.data[0]).toMatchObject({
      id: "car-1",
      carNo: "C26-001",
      verificationCount: 1,
      issuedAt: "2026-06-01T00:00:00.000Z",
      responseDueAt: "2026-06-08T00:00:00.000Z",
    });
  });

  it("issues car through repository boundary and records notification", async () => {
    vi.mocked(carRepo.findForIssue).mockResolvedValue({
      id: "car-1",
      status: "DRAFT",
      targetEmailGroup: "qa@example.com",
      targetDepartmentId: "dept-1",
      issuerId: "issuer-1",
      carNo: "C26-001",
      targetDepartment: { name: "QA", emailGroup: "qa@example.com" },
    } as never);
    vi.mocked(carRepo.issue).mockResolvedValue({} as never);
    vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(makeDetailRaw() as never);

    const result = await service.issueCar("car-1", "actor-1");

    expect(carRepo.issue).toHaveBeenCalledWith(
      "car-1",
      expect.any(Date),
      expect.any(Date),
      expect.anything()
    );
    expect(carRepo.createNotificationLog).toHaveBeenCalledWith({
      carMasterId: "car-1",
      type: "ISSUED",
      recipient: "qa@example.com",
    });
    expect(result.carNo).toBe("C26-001");
  });
});
