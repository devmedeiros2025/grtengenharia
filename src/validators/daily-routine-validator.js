import { z } from 'zod';

export const createDailyRoutineSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional().nullable().default(null),
  status: z.enum(['pending', 'in_progress', 'done']).optional().default('pending'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  assigned_to: z.string().optional().nullable().default(null),
  due_date: z.string().optional().nullable().default(null),
  column_name: z.string().optional().default('pending'),
  order_index: z.number().int().optional().default(0),
  assigned_by: z.string().optional().nullable().default(null),
});

export const updateDailyRoutineSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assigned_to: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  column_name: z.string().optional(),
  order_index: z.number().int().optional(),
  assigned_by: z.string().optional().nullable(),
});
