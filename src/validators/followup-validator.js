import { z } from 'zod';

export const createFollowupSchema = z.object({
  lead_id: z.number().int().positive('lead_id deve ser um número positivo').optional().nullable(),
  action: z.string().max(50, 'action deve ter no máximo 50 caracteres').optional().nullable().default('call'),
  description: z.string().max(500, 'description deve ter no máximo 500 caracteres').optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().nullable().default('medium'),
  user_id: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateFollowupSchema = z.object({
  lead_id: z.number().int().positive().optional(),
  action: z.string().max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  user_id: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  completed_at: z.string().optional().nullable(),
});

export const followupQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.string().optional(),
  lead_id: z.coerce.number().int().positive().optional(),
  user_id: z.coerce.number().int().positive().optional(),
});
