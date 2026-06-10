# Domain Map

1. **Authentication (auth)**: Handles login, Next-Auth, MS Graph tokens.
2. **Document Action Request (dar)**: DAR Master, Items, Approvals, Attachments.
3. **KPI (kpi)**: KPI Objectives, Monthly Reports, Corrective Actions.
4. **Document Control (document-control)**: Active documents, Categories, Revisions, Approval workflow.
5. **QMS (qms)**: QMS Processing steps for DARs.
6. **Announcements (announcements)**: Public/Company announcements, Ticker, Email notification on publish.
7. **Users & Departments (profile, departments)**: Org structure, Role management, MS365 sync.
8. **CAR (car)**: Corrective Action Request — ออก CAR, ตอบกลับ (5M), ติดตาม Verify, ปิด CAR, Re-CAR.
9. **Log (log)**: AuditLog — บันทึกทุก action (CREATE/UPDATE/DELETE/APPROVE/ISSUE/VERIFY ฯลฯ), Export Excel.
10. **Notification (notification)**: Email engine (MS Graph sendMail), Idempotent send, NotificationLog.
11. **System & IT (it, health)**: Health checks (`/api/health`), System configs, IT admin panel.
