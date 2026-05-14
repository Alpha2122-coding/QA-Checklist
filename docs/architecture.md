# Architecture Overview

## Monorepo layout
- `apps/backend` - Express API server with TypeScript, Prisma ORM, and PostgreSQL persistence
- `apps/frontend` - React + TypeScript + Vite application with Tailwind CSS and routing
- `docker-compose.yml` - local development parity with Postgres, backend, and frontend services
- `tsconfig.base.json` - shared compiler settings for both apps

## Backend design
- API prefix: `/api`
- Authentication: JWT bearer tokens
- Database models: `User` and `Checklist`
- Validation: `zod` request schemas
- Observability: request logger middleware and structured errors
- Error handling: centralized middleware avoids leaking stack traces

## Frontend design
- Responsive layout optimized for desktop, tablet, and mobile
- Primary user flows: login, registration, checklist creation, listing, removal
- Theme: dark-first interface with accessible contrast and motion transitions
- API integration via Axios with bearer token support
