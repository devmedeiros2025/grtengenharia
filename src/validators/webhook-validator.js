import { z } from 'zod';

export const createInboundSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  source: z.string().optional().nullable().default(null),
});

export const createOutboundSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  url: z.string().url('URL inválida'),
  token: z.string().optional().nullable().default(null),
  events: z.array(z.enum(['lead.created', 'lead.updated', 'lead.converted']))
    .min(1, 'Pelo menos um evento é obrigatório'),
});

export const updateOutboundSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  url: z.string().url('URL inválida').optional(),
  token: z.string().optional().nullable(),
  events: z.array(z.enum(['lead.created', 'lead.updated', 'lead.converted'])).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});
