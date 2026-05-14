import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: z.ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => ({ path: issue.path.join('.'), message: issue.message }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  const data = result.data as { body: unknown; params: unknown; query: unknown };
  req.body = data.body;
  req.params = data.params as any;
  req.query = data.query as any;
  next();
};
