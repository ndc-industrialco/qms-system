# QMS Requirements Matrix

| Module | Role Mapping | Footer Naming (Prefix / Label) | Approval Attachments | Export Format | Email Delivery Attachments |
|--------|--------------|--------------------------------|----------------------|---------------|----------------------------|
| **DAR** | Requester, Reviewer, MR, QMS | `DAR_FOOTER_PREFIX` / `DAR_FOOTER_LABEL` | REVIEWER, APPROVER_MR | Summary: Excel<br>By-ID: PDF | Generated PDF |
| **CAR** | Issuer, Dept Responder, MR, QMS | `CAR_FOOTER_PREFIX` / `CAR_FOOTER_LABEL` | RESPONDENT, APPROVER_MR | Summary: Excel<br>By-ID: PDF | Generated PDF |
| **KPI Annual** | Requester, Reviewer, Approver, QMS | `KPI_ANNUAL_FOOTER_PREFIX` / `KPI_ANNUAL_FOOTER_LABEL` | REVIEWER, APPROVER | Summary: Excel<br>By-ID: PDF | Excel export (rollover) |
| **KPI Monthly** | PreparedBy, Reviewer, Approver, QMS | `KPI_MONTHLY_FOOTER_PREFIX` / `KPI_MONTHLY_FOOTER_LABEL` | REVIEWER, APPROVER | Summary: Excel<br>By-ID: PDF | None |
| **Doc Control** | QMS, IT, MR | `DOC_CONTROL_FOOTER_PREFIX` / `DOC_CONTROL_FOOTER_LABEL` | N/A | Master List: Excel | None |
| **Audit Plan** | Lead Auditor, Auditor, Auditee, QMS | `AUDIT_PLAN_FOOTER_PREFIX` / `AUDIT_PLAN_FOOTER_LABEL` | N/A | Summary: Excel<br>By-ID: PDF | Generated PDF |
| **Auditor** | Auditor | `AUDITOR_FOOTER_PREFIX` / `AUDITOR_FOOTER_LABEL` | N/A | By-ID: PDF | Generated PDF |
