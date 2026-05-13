import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  return res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  return res.json(result);
}

export async function me(req: Request, res: Response) {
  return res.json({ user: req.user });
}
