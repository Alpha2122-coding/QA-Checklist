# QA Checklist Pro — Overhaul Plan (Production-Ready)

## Milestone 0 — Requirements & baseline (0.5–1 day)
- [ ] Inventory legacy UI routes/flows from `public/index.html` + `public/script.js`.
- [ ] Create UX sitemap + Next.js route map.
- [ ] Create initial high-fidelity mockups (desktop/tablet/mobile) for key screens.
- [ ] Define design system tokens and accessibility targets (WCAG AA+).

## Milestone 1 — Architecture foundation (2–3 days)
- [ ] Create monorepo structure: `apps/web`, `apps/api`, `packages/shared`, `packages/ui`.
- [ ] Add TypeScript tooling across workspaces.
- [ ] Implement design system skeleton (tokens + component primitives).
- [ ] Choose API framework (Fastify or Express) and initialize TypeScript server.

## Milestone 2 — Backend rewrite with DB + validations (4–6 days)
- [ ] Add PostgreSQL + Prisma schema (Users, Sessions, AppData, domain entities).
- [ ] Implement migrations + seed scripts (env-gated admin bootstrap).
- [ ] Implement auth + RBAC with robust validation (shared zod schemas).
- [ ] Add centralized error handling + request correlation logging.

## Milestone 3 — Frontend rewrite (6–9 days)
- [ ] Build Next.js app with responsive layout and theme (light/dark).
- [ ] Implement routing + app shell (sidebar/topbar/user menu).
- [ ] Implement core flows: testing, history, portfolio, automation, sheet, worksheet.
- [ ] Implement manager-only user management.

## Milestone 4 — Import/Export & data sync (2–3 days)
- [ ] Re-implement import/export UI with modern components.
- [ ] Implement save/sync strategy using server `lastUpdatedAt`.
- [ ] Preserve “restore draft” UX.

## Milestone 5 — Testing, security, CI/CD, Docker (4–6 days)
- [ ] Backend tests: Jest + Supertest; target ≥80% API coverage.
- [ ] Frontend tests: Jest + React Testing Library.
- [ ] E2E tests: Playwright (main journeys).
- [ ] Accessibility testing: axe in CI and fix issues.
- [ ] Security scans: npm audit + Snyk (if available); fix criticals.
- [ ] Dockerize API/Web/DB with compose for local parity.
- [ ] GitHub Actions CI: lint/typecheck/tests/build + coverage gate.
- [ ] Add Sentry + production logging configuration.

## Documentation & deliverables (ongoing)
- [ ] README (local run), Architecture diagram, Deployment guide.
- [ ] Design system docs (tokens + components props).
- [ ] API docs (Swagger/OpenAPI).
- [ ] CHANGELOG.
- [ ] Handover checklist + prioritized future backlog.


