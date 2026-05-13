import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma/client';

const userPayload = {
  name: 'Checklist Tester',
  email: 'checklist.user@example.com',
  password: 'SecureP@ss123',
  role: 'EMPLOYEE'
};

let token = '';

describe('Checklist API', () => {
  beforeAll(async () => {
    await prisma.checklist.deleteMany();
    await prisma.user.deleteMany({ where: { email: userPayload.email } });
    await request(app).post('/api/auth/register').send(userPayload);
    const login = await request(app).post('/api/auth/login').send({ email: userPayload.email, password: userPayload.password });
    token = login.body.token;
  });

  afterAll(async () => {
    await prisma.checklist.deleteMany();
    await prisma.user.deleteMany({ where: { email: userPayload.email } });
    await prisma.$disconnect();
  });

  it('creates, updates, and deletes a checklist item', async () => {
    const created = await request(app)
      .post('/api/checklists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Release regression', description: 'Verify smoke tests pass', status: 'PENDING' });
    expect(created.status).toBe(201);
    expect(created.body.item).toHaveProperty('id');

    const id = created.body.item.id;
    const updated = await request(app)
      .put(`/api/checklists/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PASSED' });
    expect(updated.status).toBe(200);
    expect(updated.body.item.status).toBe('PASSED');

    const removed = await request(app)
      .delete(`/api/checklists/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(204);
  });
});
