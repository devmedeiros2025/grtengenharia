import { z } from 'zod';

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('Email inválido').optional().nullable().default(''),
  phone: z.string().optional().nullable().default(''),
  company: z.string().optional().nullable().default(''),
  source: z.string().optional().nullable().default('api'),
  campaign: z.string().optional().nullable().default(null),
  message: z.string().optional().nullable().default(null),
  metadata: z.union([z.string(), z.object({})]).optional().default('{}'),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  status: z.enum(['new', 'qualified', 'converted', 'lost']).optional(),
  score: z.number().int().min(0).optional(),
  source: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  metadata: z.union([z.string(), z.object({})]).optional(),
});
