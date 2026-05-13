import { Router } from 'express';
import {
  createChecklist,
  deleteChecklist,
  getChecklist,
  listChecklists,
  updateChecklist
} from '../controllers/checklist.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { checklistSchema, checklistUpdateSchema, checklistIdSchema } from '../schemas/checklist.schemas';
import { validateRequest } from '../middlewares/validate.middleware';

export const checklistRoutes = Router();
checklistRoutes.use(authenticate);

checklistRoutes.get('/', listChecklists);
checklistRoutes.post('/', validateRequest(checklistSchema), createChecklist);
checklistRoutes.get('/:id', validateRequest(checklistIdSchema), getChecklist);
checklistRoutes.put('/:id', validateRequest(checklistUpdateSchema), updateChecklist);
checklistRoutes.delete('/:id', validateRequest(checklistIdSchema), deleteChecklist);
