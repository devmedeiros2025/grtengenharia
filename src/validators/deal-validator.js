import { z } from 'zod';

export const createDealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  value: z.number().min(0).optional().default(0),
  currency: z.string().length(3).optional().default('BRL'),
  stage: z.string().optional().default('prospecting'),
  probability: z.number().int().min(0).max(100).optional(),
  company_id: z.number().int().positive().optional().nullable().default(null),
  contact_name: z.string().optional().nullable().default(null),
  contact_email: z.string().email('Email inválido').optional().nullable().default(null),
  contact_phone: z.string().optional().nullable().default(null),
  source: z.string().optional().nullable().default(null),
  notes: z.string().optional().nullable().default(null),
});

export const updateDealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  company_id: z.number().int().positive().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email('Email inválido').optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
