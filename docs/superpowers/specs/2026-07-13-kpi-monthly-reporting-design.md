# Design Spec: Sprint 13 - KPI Monthly Reporting

**Date:** 2026-07-13  
**Status:** Pending Review  
**Topic:** KPI Monthly Reporting Enhancements (Tasks #54 - #60)  
**Author:** Senior Full-Stack Architect & UX Designer  

---

## 1. Objectives

This design document outlines the implementation plan for Sprint 13: KPI Monthly Reporting. The key items to be addressed are:
1. **Pass/Fail Percentage Dashboard (#59):** Displaying monthly achievement percentages (OK / NOT_OK) on the QMS department summary dashboard.
2. **Review Action and State Transitions:** Supporting the `PENDING_REVIEW` state on the UI client with the appropriate action buttons and API integration.
3. **Approval/Rejection Attachment Uploads (#60):** Allowing users (Reviewer, Approver, QMS, MR, IT) to upload supporting documents when reviewing, approving, or rejecting a monthly KPI report.

---

## 2. Architecture & Data Flow

### 2.1 Database & Schema Alignment
The Prisma schema already has the necessary models for tracking achievements:
- `KPIMonthlyReport`: Stores metadata of the monthly report (status, month, year, attachment, etc.).
- `KPIMonthlyDetail`: Links reports to individual objectives, storing the `actualResult` and `achievedStatus` (`OK`, `NOT_OK`, `PENDING`).

### 2.2 Data Fetching & Calculations
1. **Repository Layer:** Modify `KpiRepository.findMonthlySummary` in `repositories/kpiRepository.ts` to include monthly details:
   ```typescript
   monthlyReports: {
     where: { year },
     select: {
       id: true,
       month: true,
       status: true,
       details: { select: { achievedStatus: true } }
     }
   }
   ```
2. **Service Layer:** Update `KpiService.getMonthlySummary` in `services/kpiService.ts` to compute metrics:
   - For each report:
     - `okCount = details.filter(d => d.achievedStatus === 'OK').length`
     - `totalCount = details.length`
     - `pct = totalCount > 0 ? Math.round((okCount / totalCount) * 100) : 0`
   - Compute yearly average `avgPct` across all months with reports.

---

## 3. UI/UX Design

### 3.1 Pass/Fail Percentage on Dashboard (#59)
- **13th Summary Column:** Add a column labeled **"ปี / Avg"** to the right of the 12-month dot grid in `DeptDashboard`. This column displays the average yearly pass percentage (e.g. `85%`) based on the submitted months.
- **Detailed Dot Tooltips:** Update the status dot tooltip to display the percentage of objectives achieved for that month:
  - *Example:* `ม.ค. — อนุมัติแล้ว (ผ่าน 80%)`

### 3.2 Reviewer UI Actions
- When a report status is `PENDING_REVIEW` and the current user is the assigned reviewer (or QMS/MR/IT):
  - Display the **"Review"** (ทบทวน) button (emerald color) and **"Reject"** (ปฏิเสธ) button (rose color).
  - Clicking "Review" triggers a signature canvas, which then calls `/api/kpi/[id]/monthly/[reportId]/review` upon confirmation.

### 3.3 Attachment Uploads during Approval/Rejection (#60)
- **Inline Upload Component:** We will use the existing temp attachment API `/api/dar/attachments/temp?tempId=[UUID]` to handle file uploads.
- **Placement:**
  - **Rejection Form:** Add a file upload dropzone directly below the reason text area.
  - **Review/Approval Dialog:** In the `KpiSignatureDialog` (or directly in the main modal when action is required), display a file upload field to upload files before signing.
- **Payload:** Pass the uploaded attachment metadata `attachments: { fileName: string, spItemId: string, spWebUrl: string }[]` into the payload of the approve, review, and reject endpoints.

---

## 4. Test & Verification Plan

### 4.1 Automated Tests
- Write integration tests in `__tests__/kpi-monthly.test.ts` to verify:
  1. Auto-creation of 12-month reports on annual plan approval.
  2. Regeneration of remaining months during revision.
  3. Proper state transitions and signature generation during the Review flow.
  4. Storage of attachments in the comment JSON string of `ApprovalSignature` records.

### 4.2 Manual Walkthrough
- Verify the rendering of the Pass/Fail percentage bar and Yearly Average on the dashboard.
- Test uploading files during Approval, Review, and Rejection, confirming the files are stored in SharePoint's temp directory and linked inside the database.
