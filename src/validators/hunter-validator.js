import { z } from 'zod';

export const createEnrichmentSchema = z.object({
  lead_id: z.number().int().positive().optional().nullable(),
  source: z.string().max(100).optional().nullable().default('manual'),
  data: z.union([z.string(), z.object({})]).optional().default('{}'),
  score: z.number().min(0).max(100).optional().nullable(),
});

export const queryEnrichmentsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  source: z.string().optional().nullable(),
  lead_id: z.coerce.number().int().positive().optional().nullable(),
});
