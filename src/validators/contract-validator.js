import { z } from 'zod';

export const createContractSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  company_id: z.number().int().positive().optional().nullable().default(null),
  equipment_id: z.number().int().positive().optional().nullable().default(null),
  type: z.enum(['rental', 'service', 'construction']).optional().default('rental'),
  value: z.number().min(0).optional().default(0),
  start_date: z.string().optional().nullable().default(null),
  end_date: z.string().optional().nullable().default(null),
  status: z.enum(['draft', 'active', 'expired', 'terminated']).optional().default('active'),
  notes: z.string().optional().nullable().default(null),
  file: z.string().optional().nullable().default(null),
});

export const updateContractSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  company_id: z.number().int().positive().optional().nullable(),
  equipment_id: z.number().int().positive().optional().nullable(),
  type: z.enum(['rental', 'service', 'construction']).optional(),
  value: z.number().min(0).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'expired', 'terminated']).optional(),
  notes: z.string().optional().nullable(),
  file: z.string().optional().nullable(),
});
