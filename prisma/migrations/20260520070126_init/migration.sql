-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'IT', 'QMS', 'MR');

-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('LIST', 'SCROLLING');

-- CreateEnum
CREATE TYPE "DarStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVE', 'QMS_PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStep" AS ENUM ('PREPARER', 'REVIEWER', 'APPROVER_MR');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('DRAW', 'TYPE', 'IMAGE');

-- CreateEnum
CREATE TYPE "KpiPeriodType" AS ENUM ('YEARLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "KpiMonthlyStatus" AS ENUM ('OK', 'NG', 'PENDING');

-- CreateEnum
CREATE TYPE "KpiApprovalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KpiApprovalStep" AS ENUM ('PREPARER', 'REVIEWER', 'QMS_VERIFIER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

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
CREATE TABLE "KpiSchedule" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiMaster" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "periodType" "KpiPeriodType" NOT NULL DEFAULT 'YEARLY',
    "objectiveDetails" TEXT NOT NULL,
    "measurementFrequency" TEXT NOT NULL DEFAULT 'Every Month',
    "calculationFormula" TEXT,
    "guidelines" TEXT,
    "trackingRecords" TEXT,
    "targetValue" DECIMAL(5,2) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiMonthlyResult" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "actualValue" DECIMAL(5,2),
    "isNa" BOOLEAN NOT NULL DEFAULT false,
    "status" "KpiMonthlyStatus" NOT NULL DEFAULT 'PENDING',
    "approvalStatus" "KpiApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "spItemId" TEXT,
    "spWebUrl" TEXT,
    "spDownloadUrl" TEXT,
    "fileName" TEXT,
    "kpiMasterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiMonthlyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiCorrectiveAction" (
    "id" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "rootCauseAnalysis" TEXT NOT NULL,
    "improvementGuidelines" TEXT NOT NULL,
    "responsiblePersonM365" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "kpiMonthlyResultId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiCorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiApprovalLog" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "stepRole" "KpiApprovalStep" NOT NULL,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureUsedUrl" TEXT,
    "signatureTypeUsed" "SignatureType",
    "kpiMasterId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,

    CONSTRAINT "KpiApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_msUserId_key" ON "User"("msUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DarMaster_darNo_key" ON "DarMaster"("darNo");

-- CreateIndex
CREATE UNIQUE INDEX "QmsProcessing_darMasterId_key" ON "QmsProcessing"("darMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiSchedule_year_month_key" ON "KpiSchedule"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "KpiMonthlyResult_kpiMasterId_month_key" ON "KpiMonthlyResult"("kpiMasterId", "month");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarMaster" ADD CONSTRAINT "DarMaster_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarMaster" ADD CONSTRAINT "DarMaster_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "DarApproval" ADD CONSTRAINT "DarApproval_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarApproval" ADD CONSTRAINT "DarApproval_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QmsProcessing" ADD CONSTRAINT "QmsProcessing_darMasterId_fkey" FOREIGN KEY ("darMasterId") REFERENCES "DarMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QmsProcessing" ADD CONSTRAINT "QmsProcessing_qmsUserId_fkey" FOREIGN KEY ("qmsUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiMaster" ADD CONSTRAINT "KpiMaster_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiMonthlyResult" ADD CONSTRAINT "KpiMonthlyResult_kpiMasterId_fkey" FOREIGN KEY ("kpiMasterId") REFERENCES "KpiMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiCorrectiveAction" ADD CONSTRAINT "KpiCorrectiveAction_kpiMonthlyResultId_fkey" FOREIGN KEY ("kpiMonthlyResultId") REFERENCES "KpiMonthlyResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiApprovalLog" ADD CONSTRAINT "KpiApprovalLog_kpiMasterId_fkey" FOREIGN KEY ("kpiMasterId") REFERENCES "KpiMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiApprovalLog" ADD CONSTRAINT "KpiApprovalLog_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
