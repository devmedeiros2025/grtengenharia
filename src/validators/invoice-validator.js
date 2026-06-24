import { z } from 'zod';

export const createInvoiceSchema = z.object({
  company_id: z.number().int().positive().optional().nullable().default(null),
  contract_id: z.number().int().positive().optional().nullable().default(null),
  value: z.number().min(0).optional().default(0),
  issue_date: z.string().optional().nullable().default(null),
  due_date: z.string().optional().nullable().default(null),
  payment_date: z.string().optional().nullable().default(null),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional().default('pending'),
  notes: z.string().optional().nullable().default(null),
});

export const updateInvoiceSchema = z.object({
  company_id: z.number().int().positive().optional().nullable(),
  contract_id: z.number().int().positive().optional().nullable(),
  value: z.number().min(0).optional(),
  issue_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
});
