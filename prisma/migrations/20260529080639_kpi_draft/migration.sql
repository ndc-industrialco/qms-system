-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'IT', 'QMS', 'MR');

-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('LIST', 'SCROLLING', 'BANNER');

-- CreateEnum
CREATE TYPE "DarStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVE', 'QMS_PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStep" AS ENUM ('PREPARER', 'REVIEWER', 'APPROVER_MR');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('DRAW', 'TYPE', 'IMAGE');

-- CreateEnum
CREATE TYPE "MonthlyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AchievedStatus" AS ENUM ('PENDING', 'OK', 'NOT_OK');

-- CreateEnum
CREATE TYPE "DocControlStatus" AS ENUM ('DRAFT', 'ACTIVE', 'OBSOLETE');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailGroup" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "msUserId" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "position" TEXT,
    "savedSignatureUrl" TEXT,
    "signatureType" "SignatureType",
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("configKey")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "displayType" "DisplayType" NOT NULL DEFAULT 'LIST',
    "pushToCompanyCenter" BOOLEAN NOT NULL DEFAULT false,
    "expiryDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "bgColor" TEXT,
    "bgImageUrl" TEXT,
    "bgImageSpId" TEXT,
    "textColor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarMaster" (
    "id" TEXT NOT NULL,
    "darNo" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objective" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docTypeOther" TEXT,
    "reason" TEXT NOT NULL,
    "spFolderId" TEXT,
    "spFolderPath" TEXT,
    "spDriveId" TEXT,
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "status" "DarStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarItem" (
    "id" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "darMasterId" TEXT NOT NULL,

    CONSTRAINT "DarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarDistribution" (
    "id" TEXT NOT NULL,
    "darMasterId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "DarDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "spItemId" TEXT NOT NULL,
    "spWebUrl" TEXT NOT NULL,
    "spDownloadUrl" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "darMasterId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DarAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarApproval" (
    "id" TEXT NOT NULL,
    "stepRole" "ApprovalStep" NOT NULL,
    "action" "ApprovalAction" NOT NULL DEFAULT 'PENDING',
    "actionDate" TIMESTAMP(3),
    "signatureUsedUrl" TEXT,
    "signatureTypeUsed" "SignatureType",
    "darMasterId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "DarApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QmsProcessing" (
    "id" TEXT NOT NULL,
    "chkHasAttachment" BOOLEAN NOT NULL DEFAULT false,
    "chkPrintAndValidate" BOOLEAN NOT NULL DEFAULT false,
    "chkRenumber" BOOLEAN NOT NULL DEFAULT false,
    "chkImpactInvestigated" BOOLEAN NOT NULL DEFAULT false,
    "chkSubmitVerification" BOOLEAN NOT NULL DEFAULT false,
    "chkGetBackProcess" BOOLEAN NOT NULL DEFAULT false,
    "chkCopyDistribute" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "processDate" TIMESTAMP(3),
    "darMasterId" TEXT NOT NULL,
    "qmsUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QmsProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicDocument" (
    "id" TEXT NOT NULL,
    "darMasterId" TEXT,
    "docNumber" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "spDriveId" TEXT NOT NULL,
    "spItemId" TEXT NOT NULL,
    "spFolderPath" TEXT,
    "spWebUrl" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "yearly" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "prepare" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "approver" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_objectives" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "objective" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "calculation_formula" TEXT NOT NULL,
    "action_plan_guidelines" TEXT NOT NULL,
    "reference_documents" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_monthly_reports" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "MonthlyStatus" NOT NULL DEFAULT 'DRAFT',
    "prepare_by" TEXT,
    "review_by" TEXT,
    "approve_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_monthly_details" (
    "id" TEXT NOT NULL,
    "monthly_report_id" TEXT NOT NULL,
    "kpi_objective_id" TEXT NOT NULL,
    "actual_result" DOUBLE PRECISION,
    "achievedStatus" "AchievedStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_monthly_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_corrective_actions" (
    "id" TEXT NOT NULL,
    "monthly_detail_id" TEXT NOT NULL,
    "times" INTEGER NOT NULL,
    "root_cause" TEXT NOT NULL,
    "guidelines" TEXT NOT NULL,
    "responsible_person" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentControl" (
    "id" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "revision" TEXT,
    "description" TEXT,
    "status" "DocControlStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "spDriveId" TEXT,
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "spFolderPath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "categoryId" TEXT,

    CONSTRAINT "DocumentControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentControlRevision" (
    "id" TEXT NOT NULL,
    "documentControlId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "status" "DocControlStatus" NOT NULL DEFAULT 'ACTIVE',
    "spDriveId" TEXT,
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "spFolderPath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentControlRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_msUserId_key" ON "User"("msUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DarMaster_darNo_key" ON "DarMaster"("darNo");

-- CreateIndex
CREATE INDEX "DarMaster_status_idx" ON "DarMaster"("status");

-- CreateIndex
CREATE INDEX "DarMaster_requesterId_idx" ON "DarMaster"("requesterId");

-- CreateIndex
CREATE INDEX "DarMaster_departmentId_idx" ON "DarMaster"("departmentId");

-- CreateIndex
CREATE INDEX "DarAttachment_darMasterId_idx" ON "DarAttachment"("darMasterId");

-- CreateIndex
CREATE INDEX "DarAttachment_spItemId_idx" ON "DarAttachment"("spItemId");

-- CreateIndex
CREATE INDEX "DarApproval_darMasterId_idx" ON "DarApproval"("darMasterId");

-- CreateIndex
CREATE INDEX "DarApproval_assignedUserId_idx" ON "DarApproval"("assignedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "QmsProcessing_darMasterId_key" ON "QmsProcessing"("darMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_monthly_reports_kpi_id_month_year_key" ON "kpi_monthly_reports"("kpi_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_monthly_details_monthly_report_id_kpi_objective_id_key" ON "kpi_monthly_details"("monthly_report_id", "kpi_objective_id");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentControl_docNumber_key" ON "DocumentControl"("docNumber");

-- CreateIndex
CREATE INDEX "DocumentControl_status_idx" ON "DocumentControl"("status");

-- CreateIndex
CREATE INDEX "DocumentControl_categoryId_idx" ON "DocumentControl"("categoryId");

-- CreateIndex
CREATE INDEX "DocumentControl_createdById_idx" ON "DocumentControl"("createdById");

-- CreateIndex
CREATE INDEX "DocumentControl_departmentId_idx" ON "DocumentControl"("departmentId");

-- CreateIndex
CREATE INDEX "DocumentCategory_departmentId_idx" ON "DocumentCategory"("departmentId");

-- CreateIndex
CREATE INDEX "DocumentControlRevision_documentControlId_idx" ON "DocumentControlRevision"("documentControlId");

-- CreateIndex
CREATE INDEX "DocumentControlRevision_status_idx" ON "DocumentControlRevision"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarMaster" ADD CONSTRAINT "DarMaster_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarMaster" ADD CONSTRAINT "DarMaster_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarItem" ADD CONSTRAINT "DarItem_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarDistribution" ADD CONSTRAINT "DarDistribution_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarDistribution" ADD CONSTRAINT "DarDistribution_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarAttachment" ADD CONSTRAINT "DarAttachment_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarAttachment" ADD CONSTRAINT "DarAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarApproval" ADD CONSTRAINT "DarApproval_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarApproval" ADD CONSTRAINT "DarApproval_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QmsProcessing" ADD CONSTRAINT "QmsProcessing_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QmsProcessing" ADD CONSTRAINT "QmsProcessing_qmsUserId_fkey" FOREIGN KEY ("qmsUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_objectives" ADD CONSTRAINT "kpi_objectives_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_monthly_reports" ADD CONSTRAINT "kpi_monthly_reports_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_monthly_details" ADD CONSTRAINT "kpi_monthly_details_monthly_report_id_fkey" FOREIGN KEY ("monthly_report_id") REFERENCES "kpi_monthly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_monthly_details" ADD CONSTRAINT "kpi_monthly_details_kpi_objective_id_fkey" FOREIGN KEY ("kpi_objective_id") REFERENCES "kpi_objectives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_corrective_actions" ADD CONSTRAINT "kpi_corrective_actions_monthly_detail_id_fkey" FOREIGN KEY ("monthly_detail_id") REFERENCES "kpi_monthly_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControl" ADD CONSTRAINT "DocumentControl_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControl" ADD CONSTRAINT "DocumentControl_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControl" ADD CONSTRAINT "DocumentControl_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControl" ADD CONSTRAINT "DocumentControl_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCategory" ADD CONSTRAINT "DocumentCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControlRevision" ADD CONSTRAINT "DocumentControlRevision_documentControlId_fkey" FOREIGN KEY ("documentControlId") REFERENCES "DocumentControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentControlRevision" ADD CONSTRAINT "DocumentControlRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
