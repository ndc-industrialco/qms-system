import { z } from "zod";

export const carCreateSchema = z.object({
  sourceType: z.enum(["I", "C", "N", "O"]),
  sourceDetail: z.string().optional(),
  isoStandards: z.array(z.string()).min(1, "เลือก ISO Standard อย่างน้อย 1 ข้อ"),
  defectDetail: z.string().min(1, "กรุณากรอกรายละเอียดข้อบกพร่อง"),
  nonConformanceRef: z.string().min(1, "กรุณากรอกข้อกำหนดที่ไม่สอดคล้อง"),
  issuerId: z.string().optional(),
  issuerPosition: z.string().min(1, "กรุณากรอกตำแหน่ง"),
  targetDepartmentId: z.string().min(1, "กรุณาเลือกแผนก"),
  targetEmailGroup: z.string().optional(),
  reCar: z.boolean().optional().default(false),
  reCarRefId: z.string().optional(),
});

export const carUpdateSchema = carCreateSchema.partial();

export const carRespondSchema = z.object({
  responderPosition: z.string().min(1, "กรุณากรอกตำแหน่ง"),
  whyAnalysis: z.string().min(1, "กรุณากรอกการวิเคราะห์สาเหตุ"),
  additionalToolDetail: z.string().optional(),
  rootCausePerson: z.boolean().default(false),
  rootCauseMaterial: z.boolean().default(false),
  rootCauseMachine: z.boolean().default(false),
  rootCauseMethod: z.boolean().default(false),
  rootCauseOther: z.boolean().default(false),
  rootCauseOtherDetail: z.string().optional(),
  rootCauseSummary: z.string().min(1, "กรุณากรอกสรุปสาเหตุหลัก"),
  immediateAction: z.string().min(1, "กรุณากรอกการดำเนินการแก้ไขเบื้องต้น"),
  preventiveAction: z.string().min(1, "กรุณากรอกการดำเนินการป้องกัน"),
  plannedCompletionDate: z.string().min(1, "กรุณาเลือกวันที่กำหนดเสร็จ"),
});

export const carVerifySchema = z.object({
  round: z.number().int().min(1).max(2),
  findings: z.string().min(1, "กรุณากรอกสิ่งที่พบ"),
  result: z.enum(["PASSED", "FAILED"]),
  nextDueDate: z.string().optional(),
  verifierPosition: z.string().min(1, "กรุณากรอกตำแหน่ง"),
}).refine(
  (data) => !(data.result === "FAILED" && data.round === 1 && !data.nextDueDate),
  { message: "กรุณาระบุวันติดตามครั้งที่ 2", path: ["nextDueDate"] },
);

export const carCloseSchema = z.object({
  token: z.string().min(1),
  comment: z.string().optional(),
});

export const carListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "ISSUED", "RESPONDED", "VERIFY_1", "VERIFY_2", "CLOSED", "RE_CAR", "CANCELLED"]).optional(),
  sourceType: z.enum(["I", "C", "N", "O"]).optional(),
});

export type CarCreateInput = z.infer<typeof carCreateSchema>;
export type CarUpdateInput = z.infer<typeof carUpdateSchema>;
export type CarRespondInput = z.infer<typeof carRespondSchema>;
export type CarVerifyInput = z.infer<typeof carVerifySchema>;
export type CarCloseInput = z.infer<typeof carCloseSchema>;
export type CarListQuery = z.infer<typeof carListQuerySchema>;
