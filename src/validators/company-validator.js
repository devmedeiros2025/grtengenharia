import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('Email inválido').optional().nullable().default(null),
  phone: z.string().optional().nullable().default(null),
  website: z.string().url('URL inválida').optional().nullable().default(null),
  cnpj: z.string().optional().nullable().default(null),
  address: z.string().optional().nullable().default(null),
  city: z.string().optional().nullable().default(null),
  state: z.string().optional().nullable().default(null),
  zip: z.string().optional().nullable().default(null),
  segment: z.string().optional().nullable().default(null),
  notes: z.string().optional().nullable().default(null),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url('URL inválida').optional().nullable(),
  cnpj: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  segment: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});
