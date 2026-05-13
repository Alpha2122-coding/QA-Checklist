import { z } from 'zod';

export const authSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Please enter your name.'),
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    role: z.enum(['MANAGER', 'EMPLOYEE']).default('EMPLOYEE')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8)
  })
});
