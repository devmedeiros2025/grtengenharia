import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome deve ter no máximo 255 caracteres'),
  type: z.string().max(50).optional().nullable().default('email'),
  description: z.string().max(1000).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).optional().nullable().default(0),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional().nullable().default('draft'),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.string().max(50).optional(),
  description: z.string().max(1000).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const campaignQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.string().optional(),
  type: z.string().optional(),
});

export const addTargetSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  company_id: z.number().int().positive().optional().nullable(),
});
