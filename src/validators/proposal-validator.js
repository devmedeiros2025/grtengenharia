import { z } from 'zod';

export const createProposalSchema = z.object({
  company_id: z.number().int().positive().optional().nullable().default(null),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  value: z.number().min(0).optional().default(0),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).optional().default('draft'),
  valid_until: z.string().optional().nullable().default(null),
  notes: z.string().optional().nullable().default(null),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(1).default(1),
    unit_price: z.number().min(0).default(0),
  })).optional().default([]),
});

export const updateProposalSchema = z.object({
  company_id: z.number().int().positive().optional().nullable(),
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  value: z.number().min(0).optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).optional(),
  valid_until: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(1).default(1),
    unit_price: z.number().min(0).default(0),
  })).optional(),
});
