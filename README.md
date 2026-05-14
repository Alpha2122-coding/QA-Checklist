# QA Checklist Pro

A modern, production-ready QA checklist platform rebuilt as a TypeScript monorepo with separate backend and frontend services.

## What's included

- **Backend**: Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Auth**: JWT-based login/register flows
- **CRUD**: Checklist management for core QA workflows
- **Dev parity**: Docker Compose with Postgres, backend, and frontend
- **Testing**: Jest + Supertest for backend, Jest + React Testing Library for frontend
- **CI**: GitHub Actions workflow for lint/test/build
- **Docs**: architecture, deployment, design system, handover, bug triage

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy example environment files:
   ```bash
   cp .env.example .env
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```
3. Start development services:
   ```bash
   npm run dev
   ```
4. Open the app:
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:4000/api/health`

## Local Docker development

```bash
docker compose up --build
```

## Packages overview

- `apps/backend` - API server with Prisma migrations and seed support
- `apps/frontend` - UI app with routes for login, registration, and dashboard
- `docs/` - supporting design, architecture, deployment, and onboarding docs

## Scripts

- `npm run dev` — run backend and frontend concurrently
- `npm run build` — build both backend and frontend
- `npm test` — run backend + frontend tests
- `npm run lint` — lint both workspaces
- `npm run format` — run prettier formatting across workspace

## Key files

- `docker-compose.yml` — local dev environment
- `apps/backend/prisma/schema.prisma` — database schema
- `apps/backend/prisma/seed.ts` — seed sample data
- `apps/frontend/src/pages` — user-facing application flows
- `.github/workflows/ci.yml` — CI pipeline for test and build gating

## Notes

- The app is designed for a PostgreSQL backend; update `DATABASE_URL` in `.env`.
- Use a strong `JWT_SECRET` for production deployments.
- Frontend API requests originate from `VITE_API_URL`.

## Additional documentation

- `docs/architecture.md`
- `docs/deployment.md`
- `docs/design-system.md`
- `handover-checklist.md`
- `docs/bug-triage.md`
- `CHANGELOG.md`

## 🚨 Security Best Practices

1. **Change default admin password immediately**
2. **Use HTTPS in production**
3. **Set a strong JWT_SECRET in .env**
4. **Regularly update dependencies**
5. **Monitor logs for suspicious activity**
6. **Use strong passwords (8+ characters)**
7. **Enable rate limiting in production**

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### User Management (Manager Only)
- `GET /api/users` - List all users
- `GET /api/users/pending` - List pending approvals
- `POST /api/users/:id/approve` - Approve user
- `POST /api/users/:id/reject` - Reject user
- `POST /api/users/:id/suspend` - Suspend user
- `POST /api/users/:id/activate` - Activate user
- `PUT /api/users/:id/role` - Change user role
- `DELETE /api/users/:id` - Delete user

### Data Management
- `GET /api/data` - Get user's app data
- `PUT /api/data` - Save user's app data
- `GET /api/sessions` - Get active sessions

### System
- `GET /api/health` - Health check

## 🐛 Known Issues & Limitations

1. **File-based storage** - Not suitable for large-scale deployments (>100 users)
2. **No email verification** - User approval is manual
3. **No password reset** - Contact admin to reset password
4. **Single server** - No clustering support

## 🔄 Future Enhancements

- [ ] Database support (PostgreSQL, MongoDB)
- [ ] Email notifications
- [ ] Password reset via email
- [ ] Two-factor authentication
- [ ] Audit logging
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Docker support
- [ ] CI/CD pipeline
- [ ] Real-time collaboration

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📧 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/Alpha2122-coding/QA-Checklist/issues)
- Email: admin@qa.com

---

**Built with ❤️ using Node.js, Express, and vanilla JavaScript**