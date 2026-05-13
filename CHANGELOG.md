# Changelog

## 3.0.0 - Production-ready overhaul

### Added
- Monorepo architecture with `apps/backend` and `apps/frontend`
- Express + TypeScript backend with Prisma PostgreSQL persistence
- React + TypeScript + Vite frontend with Tailwind CSS and responsive UI
- JWT authentication and checklist CRUD API
- Docker and `docker-compose` for local development parity
- Jest + Supertest backend tests and frontend Jest smoke test
- Design system documentation and deployment guide

### Changed
- Removed legacy file-based backend and unsupported client scaffold
- Replaced root package configuration with npm workspaces

### Fixed
- Established centralized error handling and request validation
- Implemented secure auth middleware and rate limiting
