-- CreateEnum
CREATE TYPE "KpiObjectiveStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "kpis" ADD COLUMN     "approver_user_id" TEXT,
ADD COLUMN     "prepare_signature" TEXT,
ADD COLUMN     "reviewer_user_id" TEXT,
ADD COLUMN     "status" "KpiObjectiveStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submitted_at" TIMESTAMP(3);
