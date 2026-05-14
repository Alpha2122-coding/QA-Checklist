import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';

const secret = process.env.JWT_SECRET || 'change-me';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, secret) as { userId: string };
    const user = await prisma.user.findUnique({ select: { id: true, name: true, email: true, role: true }, where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
