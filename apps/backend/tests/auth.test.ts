import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma/client';

const userPayload = {
  name: 'Integration Tester',
  email: 'test.user@example.com',
  password: 'SecureP@ss123',
  role: 'EMPLOYEE'
};

describe('Auth API', () => {
  beforeAll(async () => {
    await prisma.checklist.deleteMany();
    await prisma.user.deleteMany({ where: { email: userPayload.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: userPayload.email } });
    await prisma.$disconnect();
  });

  it('registers a new account', async () => {
    const response = await request(app).post('/api/auth/register').send(userPayload);
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: userPayload.name, email: userPayload.email });
  });

  it('handles login after registration', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: userPayload.email, password: userPayload.password });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({ email: userPayload.email });
  });
});
