import { prisma } from '../prisma/client';

export const checklistService = {
  async findAll(ownerId: string) {
    return prisma.checklist.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async findById(id: string) {
    const item = await prisma.checklist.findUnique({ where: { id } });
    if (!item) {
      throw { statusCode: 404, message: 'Checklist item not found' };
    }
    return item;
  },

  async create(ownerId: string, data: { title: string; description?: string; status?: string }) {
    return prisma.checklist.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status ?? 'PENDING',
        ownerId
      }
    });
  },

  async update(id: string, data: { title?: string; description?: string; status?: string }) {
    await this.findById(id);
    return prisma.checklist.update({
      where: { id },
      data: { ...data }
    });
  },

  async remove(id: string) {
    await this.findById(id);
    await prisma.checklist.delete({ where: { id } });
  }
};
