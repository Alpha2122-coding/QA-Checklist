import { Request, Response } from 'express';
import { checklistService } from '../services/checklist.service';

export async function listChecklists(req: Request, res: Response) {
  const userId = req.user?.id as string;
  const items = await checklistService.findAll(userId);
  return res.json({ items });
}

export async function getChecklist(req: Request, res: Response) {
  const item = await checklistService.findById(req.params.id);
  return res.json({ item });
}

export async function createChecklist(req: Request, res: Response) {
  const userId = req.user?.id as string;
  const item = await checklistService.create(userId, req.body);
  return res.status(201).json({ item });
}

export async function updateChecklist(req: Request, res: Response) {
  const item = await checklistService.update(req.params.id, req.body);
  return res.json({ item });
}

export async function deleteChecklist(req: Request, res: Response) {
  await checklistService.remove(req.params.id);
  return res.status(204).send();
}
