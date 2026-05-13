import { z } from 'zod';

const checklistBase = {
  title: z.string().min(3, 'Checklist title must have at least 3 characters.'),
  description: z.string().max(800).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED']).optional()
};

export const checklistSchema = z.object({
  body: z.object({
    title: checklistBase.title,
    description: checklistBase.description,
    status: checklistBase.status
  })
});

export const checklistUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid checklist ID format')
  }),
  body: z.object({
    title: checklistBase.title.optional(),
    description: checklistBase.description,
    status: checklistBase.status
  })
});

export const checklistIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid checklist ID format')
  })
});
