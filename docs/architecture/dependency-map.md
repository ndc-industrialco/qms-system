# Dependency Map

- **Feature -> API**: Frontend components (e.g., `dar-form`) call `/api/dar`.
- **API -> Service**: API Routes strictly call functions in `services/` (e.g., `darService.createDar`).
- **Service -> Repository**: Services call `repositories/` (e.g., `darRepository.create`).
- **Repository -> Database**: Repositories use Prisma Client.
- **Frontend -> API**: React Query hooks fetch from `/api/...`.
- **Shared Components -> Consumers**: `components/ui/*` consumed by `app/(dashboard)/*`.
- **External Integrations -> Related Modules**: `email.ts` and `sharepoint.ts` consumed by `darService` and `kpiService`.
- **CAR Service Dependencies**: `carService.ts` → `carRepository.ts`, `carSequenceRepository.ts`, `systemConfigRepository.ts`, `userRepository.ts`, `actionTokenService.ts`, `carEmailService.ts`, `auditService.ts`.
- **CAR Email Dependencies**: `carEmailService.ts` → `ms-graph.ts` (Graph token + sendMail), `lib/graph-token.ts`, `lib/graphFetch.ts`.
- **CAR Frontend Dependencies**: `CarFormDrawer` → `GraphUserPicker` (`/api/ms-graph/users/search`) + `GraphGroupPicker` (`/api/ms-graph/groups/search`).
- **Shared Graph Pickers**: `components/shared/GraphUserPicker.tsx` and `GraphGroupPicker.tsx` — reusable across any form needing MS365 user/group selection.
