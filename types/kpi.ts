import type { MonthlyStatus, AchievedStatus } from '@/generated/prisma/client';

export interface CreateKpiDTO {
  yearly: number;
  department: string;
  prepare?: string;
  reviewer?: string;
  approver?: string;
}

export interface UpdateKpiDTO {
  yearly?: number;
  department?: string;
  prepare?: string;
  reviewer?: string;
  approver?: string;
}

export interface CreateKpiObjectiveDTO {
  kpiId: string;
  target: number;
  unit?: string;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments?: string;
}

export interface UpdateKpiObjectiveDTO {
  target?: number;
  unit?: string;
  objective?: string;
  frequency?: string;
  calculationFormula?: string;
  actionPlanGuidelines?: string;
  referenceDocuments?: string;
}

export interface CreateMonthlyReportDTO {
  kpiId: string;
  month: string;
  year: number;
}

export interface UpdateMonthlyDetailDTO {
  actualResult?: number | null;
  achievedStatus?: AchievedStatus;
}

export interface UpdateMonthlyReportDTO {
  remark?: string | null;
}

export interface MonthlyReportAttachmentDTO {
  fileName: string;
  fileSize: number;
  mimeType: string;
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface CreateCorrectiveActionDTO {
  monthlyDetailId: string;
  times: number;
  rootCause: string;
  guidelines: string;
  responsiblePerson: string;
  dueDate: Date;
}

export interface ActorContext {
  userId: string;
  role: 'USER' | 'IT' | 'QMS' | 'MR';
  departmentId?: string | null;
}

export interface ListKpiQuery {
  page: number;
  limit: number;
  yearly?: number;
  department?: string;
}

export interface SubmitKpiObjectivesDTO {
  prepareSignature: string;
  reviewerUserId: string;
  approverUserId: string;
}

export interface ListMonthlyQuery {
  page: number;
  limit: number;
  kpiId?: string;
  year?: number;
  month?: string;
  department?: string;
  status?: MonthlyStatus;
}
