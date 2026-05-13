import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json } from 'express';
import { authRoutes } from './routes/auth.routes';
import { checklistRoutes } from './routes/checklist.routes';
import { errorHandler } from './middlewares/error.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';

export const app = express();

app.use(helmet());
app.use(json());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(loggerMiddleware);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/checklists', checklistRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use(errorHandler);
