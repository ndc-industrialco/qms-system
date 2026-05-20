import {
  pgTable,
  pgEnum,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  unique,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("UserRole", ["USER", "IT", "QMS", "MR"]);
export const displayTypeEnum = pgEnum("DisplayType", ["LIST", "SCROLLING"]);
export const darStatusEnum = pgEnum("DarStatus", [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_APPROVE",
  "QMS_PROCESSING",
  "COMPLETED",
  "CANCELLED",
]);
export const approvalActionEnum = pgEnum("ApprovalAction", ["PENDING", "APPROVED", "REJECTED"]);
export const approvalStepEnum = pgEnum("ApprovalStep", ["PREPARER", "REVIEWER", "APPROVER_MR"]);
export const signatureTypeEnum = pgEnum("SignatureType", ["DRAW", "TYPE", "IMAGE"]);
export const kpiPeriodTypeEnum = pgEnum("KpiPeriodType", ["YEARLY", "QUARTERLY"]);
export const kpiMonthlyStatusEnum = pgEnum("KpiMonthlyStatus", ["OK", "NG", "PENDING"]);
export const kpiApprovalStatusEnum = pgEnum("KpiApprovalStatus", [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "VERIFIED",
  "REJECTED",
]);
export const kpiApprovalStepEnum = pgEnum("KpiApprovalStep", [
  "PREPARER",
  "REVIEWER",
  "QMS_VERIFIER",
]);

// ── Exported TypeScript types ─────────────────────────────────────────────────

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type DisplayType = (typeof displayTypeEnum.enumValues)[number];
export type DarStatus = (typeof darStatusEnum.enumValues)[number];
export type ApprovalAction = (typeof approvalActionEnum.enumValues)[number];
export type ApprovalStep = (typeof approvalStepEnum.enumValues)[number];
export type SignatureType = (typeof signatureTypeEnum.enumValues)[number];
export type KpiPeriodType = (typeof kpiPeriodTypeEnum.enumValues)[number];
export type KpiMonthlyStatus = (typeof kpiMonthlyStatusEnum.enumValues)[number];
export type KpiApprovalStatus = (typeof kpiApprovalStatusEnum.enumValues)[number];
export type KpiApprovalStep = (typeof kpiApprovalStepEnum.enumValues)[number];

// ── Tables ────────────────────────────────────────────────────────────────────

export const departments = pgTable("Department", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  emailGroup: text("emailGroup"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const users = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text("employeeId").unique(),
  msUserId: text("msUserId").unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("USER"),
  savedSignatureUrl: text("savedSignatureUrl"),
  signatureType: signatureTypeEnum("signatureType"),
  departmentId: text("departmentId").references(() => departments.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const systemConfig = pgTable("SystemConfig", {
  configKey: text("configKey").primaryKey(),
  configValue: text("configValue").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const announcements = pgTable("Announcement", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceSystem: text("sourceSystem").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  displayType: displayTypeEnum("displayType").notNull().default("LIST"),
  pushToCompanyCenter: boolean("pushToCompanyCenter").notNull().default(false),
  expiryDate: timestamp("expiryDate", { mode: "date" }),
  startDate: timestamp("startDate", { mode: "date" }),
  endDate: timestamp("endDate", { mode: "date" }),
  spItemId: text("spItemId"),
  spWebUrl: text("spWebUrl"),
  spDownloadUrl: text("spDownloadUrl"),
  fileName: text("fileName"),
  mimeType: text("mimeType"),
  createdById: text("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const darMasters = pgTable("DarMaster", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  darNo: text("darNo").unique(),
  requestDate: timestamp("requestDate", { mode: "date" }).notNull().defaultNow(),
  objective: text("objective").notNull(),
  docType: text("docType").notNull(),
  docTypeOther: text("docTypeOther"),
  reason: text("reason").notNull(),
  spFolderId: text("spFolderId"),
  spFolderPath: text("spFolderPath"),
  spDriveId: text("spDriveId"),
  spItemId: text("spItemId"),
  spWebUrl: text("spWebUrl"),
  status: darStatusEnum("status").notNull().default("DRAFT"),
  requesterId: text("requesterId").notNull().references(() => users.id),
  departmentId: text("departmentId").notNull().references(() => departments.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const darItems = pgTable("DarItem", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemNo: integer("itemNo").notNull(),
  docNumber: text("docNumber").notNull(),
  docName: text("docName").notNull(),
  revision: text("revision").notNull(),
  darMasterId: text("darMasterId").notNull().references(() => darMasters.id, { onDelete: "cascade" }),
});

export const darDistributions = pgTable("DarDistribution", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  darMasterId: text("darMasterId").notNull().references(() => darMasters.id, { onDelete: "cascade" }),
  departmentId: text("departmentId").notNull().references(() => departments.id),
});

export const darAttachments = pgTable("DarAttachment", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize").notNull(),
  mimeType: text("mimeType").notNull(),
  spItemId: text("spItemId").notNull(),
  spWebUrl: text("spWebUrl").notNull(),
  spDownloadUrl: text("spDownloadUrl").notNull(),
  folderPath: text("folderPath").notNull(),
  darMasterId: text("darMasterId").notNull().references(() => darMasters.id, { onDelete: "cascade" }),
  uploadedById: text("uploadedById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const darApprovals = pgTable("DarApproval", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stepRole: approvalStepEnum("stepRole").notNull(),
  action: approvalActionEnum("action").notNull().default("PENDING"),
  actionDate: timestamp("actionDate", { mode: "date" }),
  signatureUsedUrl: text("signatureUsedUrl"),
  signatureTypeUsed: signatureTypeEnum("signatureTypeUsed"),
  darMasterId: text("darMasterId").notNull().references(() => darMasters.id, { onDelete: "cascade" }),
  assignedUserId: text("assignedUserId").notNull().references(() => users.id),
});

export const qmsProcessings = pgTable("QmsProcessing", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  chkHasAttachment: boolean("chkHasAttachment").notNull().default(false),
  chkPrintAndValidate: boolean("chkPrintAndValidate").notNull().default(false),
  chkRenumber: boolean("chkRenumber").notNull().default(false),
  chkImpactInvestigated: boolean("chkImpactInvestigated").notNull().default(false),
  chkSubmitVerification: boolean("chkSubmitVerification").notNull().default(false),
  chkGetBackProcess: boolean("chkGetBackProcess").notNull().default(false),
  chkCopyDistribute: boolean("chkCopyDistribute").notNull().default(false),
  comments: text("comments"),
  processDate: timestamp("processDate", { mode: "date" }),
  darMasterId: text("darMasterId").notNull().unique().references(() => darMasters.id, { onDelete: "cascade" }),
  qmsUserId: text("qmsUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const publicDocuments = pgTable("PublicDocument", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  darMasterId: text("darMasterId"),
  docNumber: text("docNumber").notNull(),
  docName: text("docName").notNull(),
  revision: text("revision").notNull(),
  spDriveId: text("spDriveId").notNull(),
  spItemId: text("spItemId").notNull(),
  spFolderPath: text("spFolderPath"),
  spWebUrl: text("spWebUrl").notNull(),
  publishedDate: timestamp("publishedDate", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const kpiSchedules = pgTable(
  "KpiSchedule",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    dueDate: timestamp("dueDate", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
  },
  (t) => [unique().on(t.year, t.month)],
);

export const kpiMasters = pgTable("KpiMaster", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  year: integer("year").notNull(),
  periodType: kpiPeriodTypeEnum("periodType").notNull().default("YEARLY"),
  objectiveDetails: text("objectiveDetails").notNull(),
  measurementFrequency: text("measurementFrequency").notNull().default("Every Month"),
  calculationFormula: text("calculationFormula"),
  guidelines: text("guidelines"),
  trackingRecords: text("trackingRecords"),
  targetValue: numeric("targetValue", { precision: 5, scale: 2 }).notNull(),
  departmentId: text("departmentId").notNull().references(() => departments.id),
  createdById: text("createdById"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const kpiMonthlyResults = pgTable(
  "KpiMonthlyResult",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    month: integer("month").notNull(),
    actualValue: numeric("actualValue", { precision: 5, scale: 2 }),
    isNa: boolean("isNa").notNull().default(false),
    status: kpiMonthlyStatusEnum("status").notNull().default("PENDING"),
    approvalStatus: kpiApprovalStatusEnum("approvalStatus").notNull().default("DRAFT"),
    spItemId: text("spItemId"),
    spWebUrl: text("spWebUrl"),
    spDownloadUrl: text("spDownloadUrl"),
    fileName: text("fileName"),
    kpiMasterId: text("kpiMasterId").notNull().references(() => kpiMasters.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
  },
  (t) => [unique().on(t.kpiMasterId, t.month)],
);

export const kpiCorrectiveActions = pgTable("KpiCorrectiveAction", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sequenceNo: integer("sequenceNo").notNull(),
  rootCauseAnalysis: text("rootCauseAnalysis").notNull(),
  improvementGuidelines: text("improvementGuidelines").notNull(),
  responsiblePersonM365: text("responsiblePersonM365").notNull(),
  dueDate: date("dueDate").notNull(),
  kpiMonthlyResultId: text("kpiMonthlyResultId").notNull().references(() => kpiMonthlyResults.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdateFn(() => new Date()),
});

export const kpiApprovalLogs = pgTable("KpiApprovalLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  month: integer("month").notNull(),
  stepRole: kpiApprovalStepEnum("stepRole").notNull(),
  actionDate: timestamp("actionDate", { mode: "date" }).notNull().defaultNow(),
  signatureUsedUrl: text("signatureUsedUrl"),
  signatureTypeUsed: signatureTypeEnum("signatureTypeUsed"),
  kpiMasterId: text("kpiMasterId").notNull().references(() => kpiMasters.id, { onDelete: "cascade" }),
  assignedUserId: text("assignedUserId").notNull().references(() => users.id),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  darRequests: many(darMasters),
  darDistributions: many(darDistributions),
  kpiMasters: many(kpiMasters),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
  createdAnnouncements: many(announcements),
  darRequests: many(darMasters),
  darApprovals: many(darApprovals),
  darAttachments: many(darAttachments),
  qmsProcessings: many(qmsProcessings),
  kpiApprovals: many(kpiApprovalLogs),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  createdBy: one(users, { fields: [announcements.createdById], references: [users.id] }),
}));

export const darMastersRelations = relations(darMasters, ({ one, many }) => ({
  requester: one(users, { fields: [darMasters.requesterId], references: [users.id] }),
  department: one(departments, { fields: [darMasters.departmentId], references: [departments.id] }),
  items: many(darItems),
  distributions: many(darDistributions),
  approvals: many(darApprovals),
  attachments: many(darAttachments),
  qmsProcessing: one(qmsProcessings),
}));

export const darItemsRelations = relations(darItems, ({ one }) => ({
  darMaster: one(darMasters, { fields: [darItems.darMasterId], references: [darMasters.id] }),
}));

export const darDistributionsRelations = relations(darDistributions, ({ one }) => ({
  darMaster: one(darMasters, { fields: [darDistributions.darMasterId], references: [darMasters.id] }),
  department: one(departments, { fields: [darDistributions.departmentId], references: [departments.id] }),
}));

export const darAttachmentsRelations = relations(darAttachments, ({ one }) => ({
  darMaster: one(darMasters, { fields: [darAttachments.darMasterId], references: [darMasters.id] }),
  uploadedBy: one(users, { fields: [darAttachments.uploadedById], references: [users.id] }),
}));

export const darApprovalsRelations = relations(darApprovals, ({ one }) => ({
  darMaster: one(darMasters, { fields: [darApprovals.darMasterId], references: [darMasters.id] }),
  assignedUser: one(users, { fields: [darApprovals.assignedUserId], references: [users.id] }),
}));

export const qmsProcessingsRelations = relations(qmsProcessings, ({ one }) => ({
  darMaster: one(darMasters, { fields: [qmsProcessings.darMasterId], references: [darMasters.id] }),
  qmsUser: one(users, { fields: [qmsProcessings.qmsUserId], references: [users.id] }),
}));

export const kpiMastersRelations = relations(kpiMasters, ({ one, many }) => ({
  department: one(departments, { fields: [kpiMasters.departmentId], references: [departments.id] }),
  monthlyResults: many(kpiMonthlyResults),
  approvalLogs: many(kpiApprovalLogs),
}));

export const kpiMonthlyResultsRelations = relations(kpiMonthlyResults, ({ one, many }) => ({
  kpiMaster: one(kpiMasters, { fields: [kpiMonthlyResults.kpiMasterId], references: [kpiMasters.id] }),
  correctiveActions: many(kpiCorrectiveActions),
}));

export const kpiCorrectiveActionsRelations = relations(kpiCorrectiveActions, ({ one }) => ({
  kpiMonthlyResult: one(kpiMonthlyResults, { fields: [kpiCorrectiveActions.kpiMonthlyResultId], references: [kpiMonthlyResults.id] }),
}));

export const kpiApprovalLogsRelations = relations(kpiApprovalLogs, ({ one }) => ({
  kpiMaster: one(kpiMasters, { fields: [kpiApprovalLogs.kpiMasterId], references: [kpiMasters.id] }),
  assignedUser: one(users, { fields: [kpiApprovalLogs.assignedUserId], references: [users.id] }),
}));
