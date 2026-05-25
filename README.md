# QMS System (Quality Management System)

A comprehensive Quality Management System with a Digital Approval Workflow built on modern web technologies.

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (via Neon)
- **ORM:** Prisma
- **Styling:** Tailwind CSS + DaisyUI
- **Authentication:** NextAuth.js
- **Deployment:** Ubuntu Server (Docker) / Vercel
- **Integrations:** Microsoft Graph API (Email + SharePoint)

## 📁 Project Structure

To ensure maintainability and clean architecture, please follow this directory structure when developing:

```text
qms-system/
├── app/
│   ├── api/          # API routes (Server-side endpoints)
│   ├── [locale]/     # i18n routing (th, en)
│   └── (dashboard)/  # Main authenticated application pages
├── components/       # Reusable UI components (PascalCase e.g., DashboardShell.tsx)
├── lib/
│   ├── actions/      # Server Actions (for mutations only)
│   ├── auth.ts       # Authentication configuration & role requirements
│   └── errors.ts     # Custom typed errors (AppError, NotFoundError, etc.)
├── hooks/            # Custom React hooks (client-only, kebab-case e.g., use-auth.ts)
├── types/            # TypeScript interfaces & types (e.g., api.ts)
├── services/         # Business logic & external API calls (Keep separate from UI)
└── messages/         # i18n translation files (th.json as primary, en.json as fallback)
```

## 📜 Development Guidelines & Rules

Please adhere to these core principles when contributing to the codebase:

### 1. Architecture & Performance
- **Server-First Approach:** Use Server Components by default to minimize the client bundle.
- **API First:** Keep UI, logic, and data fetching clearly separated. 
- **Database Access:** **DO NOT** access the database directly in UI components or hooks. All DB access must happen in `api/` routes or `services/`.
- **API Routes:** Must be written in `async/await` (promise-based) format. Use `Promise.all()` to fetch unrelated data concurrently.
- **Large Components:** Components longer than 150 lines should be split into smaller, manageable pieces.

### 2. UI/UX & Design System
- **Colors:**
  - Primary (Brand Identity): `#0F1059`
  - Secondary (Interactive): `#1D6A8A`
- **Typography:** Inter (English) and Sarabun (Thai).
- **Forms & Interactions:**
  - ≤ 2 fields: Use **Modal**
  - 5+ fields or long workflows: Use **Drawer**
  - State UI: Always provide **Skeleton** (loading), **Empty state**, **Error**, and **Toast** (success) feedbacks.
  - Component Naming: Use **PascalCase** for components, **kebab-case** for hooks/libs.

### 3. Security & Safety (CRITICAL)
- **Type Safety:** `any` is strictly prohibited. Use strict mode.
- **Validation:** Use **Zod** for both client-side and server-side validation.
- **Runtime Safety:** ALWAYS check for `null`/`undefined` before accessing properties, especially for Session, Route params, and Form data.
- **Attachments:** Must be sent to SharePoint via Graph API only.

## 🛠️ Getting Started

First, install dependencies:
```bash
npm install
```

Generate Prisma client and push DB schema:
```bash
npm run db:generate
npm run db:push
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
