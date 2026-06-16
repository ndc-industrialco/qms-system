# QMS Task Log

- [ ] Initial setup
- [x] Modularized repository workflow instructions from `AGENTS.md` into dedicated files under `rules/` for smaller targeted reads.
- [x] Added portable agent workflow templates with placeholders for reuse across projects.
- [x] Added dedicated shared UI rules from `ui-rule-example` for design system, layouts, forms, components, patterns, and tables.
- [x] Replanned the QMS delivery roadmap into Agile SDLC sprints around actual unfinished work: CAR stabilization, document control, internal audit, external audit, and AI RAG.
- [x] Switched DAR approval-config page data sourcing away from direct local DB reads to `ApprovalConfigService`, allowing QMS admin assignment screens to work in `auth_center` mode using Auth Center user lists plus local mirror fallback.
