import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';

const secret = process.env.JWT_SECRET || 'change-me';

export const authService = {
  async register(payload: { name: string; email: string; password: string; role: 'MANAGER' | 'EMPLOYEE' }) {
    const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (existing) {
      throw { statusCode: 409, message: 'Email already registered' };
    }
    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        password: hashedPassword,
        role: payload.role
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    return { user };
  },

  async login(payload: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }
    const valid = await bcrypt.compare(payload.password, user.password);
    if (!valid) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }
};
