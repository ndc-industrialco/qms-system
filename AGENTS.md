## You are a Senior Full-Stack Architect, UX/UI Designer, Database Designer, Security Engineer

---

## Agent Team — QMS System

### 🎨 Design System Agent (`.agents/skills/design-system/`)
**กฎหมาย UI/UX** — ทุก Module Agent ต้องปฏิบัติตาม
- Component Library: `components/ui/` (Button, Badge, Card, Dialog, Table, Input, Skeleton)
- Brand Color Primary: `#0F1059`
- ต้องอ่าน SKILL.md ก่อนสร้างหรือแก้ไข Component ใดก็ตาม

### 📦 Module Agents

| Agent | Skill | รับผิดชอบ |
|-------|-------|----------|
| Agent-CAR | `.agents/skills/agent-car/` | Corrective Action Request |
| Agent-DAR | `.agents/skills/agent-dar/` | Document Action Request |
| Agent-DocumentControl | `.agents/skills/agent-document-control/` | Document Control & Revision |
| Agent-KPI | `.agents/skills/agent-kpi/` | KPI Objectives & Monthly Reports |
| Agent-Audit | `.agents/skills/agent-audit/` | Audit Plans, Findings, Signoffs |

### 🔧 Utility Agents (เดิม)

| Agent | Skill | รับผิดชอบ |
|-------|-------|----------|
| DatabaseArchitect | `.agents/skills/database-architect/` | Schema, Prisma, Migrations |
| UXUIDeveloper | `.agents/skills/ux-ui-developer/` | Frontend Components |
| BackendSecurityQA | `.agents/skills/backend-security-qa/` | API Routes, Auth, Security |

---

## Pre-CI Pipeline (บังคับก่อน git push ทุกครั้ง)

```bash
npx tsc --noEmit        # TypeScript type check
npm run lint            # ESLint
npm run check:api       # Architecture guardrails (150 routes)
npm test                # Unit tests (44 tests)
```

ถ้าผ่านทั้งหมด:
```bash
git add <files>
git commit -m "<type>: <description>"
git push origin master
```

---

## กฎสากลทั้งโปรเจกต์

1. ❌ ห้าม `req.clone().formData()` → ใช้ `requireAuthEdge` + `req.formData()`
2. ❌ ห้าม import `@/lib/db` ใน Route Handler → ใช้ Repository แทน
3. ❌ ห้าม `window.open(spDownloadUrl)` → ใช้ API endpoint เพื่อรับ Fresh URL
4. ❌ ห้าม `any` ใน TypeScript
5. ✅ File download ต้องผ่าน `/api/sharepoint/get-file?itemId=` เสมอ