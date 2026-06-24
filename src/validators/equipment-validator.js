import { z } from 'zod';

export const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  type: z.string().optional().nullable().default(null),
  brand: z.string().optional().nullable().default(null),
  model: z.string().optional().nullable().default(null),
  plate: z.string().optional().nullable().default(null),
  year: z.number().int().min(1900).max(2100).optional().nullable().default(null),
  status: z.enum(['available', 'rented', 'maintenance']).optional().default('available'),
  daily_rate: z.number().min(0).optional().default(0),
  monthly_rate: z.number().min(0).optional().default(0),
  photo: z.string().optional().nullable().default(null),
  notes: z.string().optional().nullable().default(null),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  type: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  plate: z.string().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  status: z.enum(['available', 'rented', 'maintenance']).optional(),
  daily_rate: z.number().min(0).optional(),
  monthly_rate: z.number().min(0).optional(),
  photo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
