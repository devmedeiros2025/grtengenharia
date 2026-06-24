import { z } from 'zod';

export const createProjectSchema = z.object({
  company_id: z.number().int().positive().optional().nullable().default(null),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional().nullable().default(null),
  value: z.number().min(0).optional().default(0),
  status: z.enum(['planning', 'in_progress', 'completed', 'cancelled']).optional().default('planning'),
  start_date: z.string().optional().nullable().default(null),
  end_date: z.string().optional().nullable().default(null),
  notes: z.string().optional().nullable().default(null),
});

export const updateProjectSchema = z.object({
  company_id: z.number().int().positive().optional().nullable(),
  title: z.string().min(1, 'Título é obrigatório').max(255).optional(),
  description: z.string().optional().nullable(),
  value: z.number().min(0).optional(),
  status: z.enum(['planning', 'in_progress', 'completed', 'cancelled']).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createPhaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional().nullable().default(null),
  start_date: z.string().optional().nullable().default(null),
  end_date: z.string().optional().nullable().default(null),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
});

export const updatePhaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  description: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
});
