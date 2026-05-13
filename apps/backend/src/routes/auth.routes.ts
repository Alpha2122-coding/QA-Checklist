import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller';
import { authSchema, loginSchema } from '../schemas/auth.schemas';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', validateRequest(authSchema), register);
authRoutes.post('/login', validateRequest(loginSchema), login);
authRoutes.get('/me', authenticate, me);
