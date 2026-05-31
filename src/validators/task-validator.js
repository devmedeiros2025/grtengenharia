import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional().nullable().default(null),
  status: z.enum(['pending', 'in_progress', 'done']).optional().default('pending'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  due_date: z.string().optional().nullable().default(null),
  deal_id: z.number().int().positive().optional().nullable().default(null),
  company_id: z.number().int().positive().optional().nullable().default(null),
  assigned_to: z.string().optional().nullable().default(null),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  due_date: z.string().optional().nullable(),
  deal_id: z.number().int().positive().optional().nullable(),
  company_id: z.number().int().positive().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});
