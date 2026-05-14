import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = typeof err === 'object' && err && 'statusCode' in err ? (err as any).statusCode : 500;
  const message = typeof err === 'object' && err && 'message' in err ? (err as any).message : 'Internal Server Error';
  res.status(statusCode as number).json({ message, status: 'error' });
}
