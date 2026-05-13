# Deployment Guide

## Local development
1. Install dependencies at the repository root:
   ```bash
   npm install
   ```
2. Create environment files from the examples:
   ```bash
   cp .env.example .env
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```
3. Start services:
   ```bash
   npm run dev
   ```
4. Open frontend at `http://localhost:5173` and backend health at `http://localhost:4000/api/health`.

## Docker development
1. Start all services:
   ```bash
   docker compose up --build
   ```
2. The frontend runs on `http://localhost:5173` and backend on `http://localhost:4000`.

## Production notes
- Use a managed PostgreSQL database and secure `JWT_SECRET` in environment configuration.
- Build frontend separately and serve from a CDN or static host.
- Run Prisma migrations before starting backend:
  ```bash
  npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
  ```
- Ensure `FRONTEND_URL` is set to the production domain.
