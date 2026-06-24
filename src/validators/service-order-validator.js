import { z } from 'zod';

export const createServiceOrderSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional().nullable().default(null),
  equipment_id: z.number().int().positive().optional().nullable().default(null),
  client_id: z.number().int().positive().optional().nullable().default(null),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional().default('open'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  assigned_to: z.string().optional().nullable().default(null),
  value: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable().default(null),
});

export const updateServiceOrderSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  description: z.string().optional().nullable(),
  equipment_id: z.number().int().positive().optional().nullable(),
  client_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assigned_to: z.string().optional().nullable(),
  value: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});
