import { ZodError } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Trata erros de validação Zod e erros genéricos,
 * retornando resposta 400 padronizada via ValidationError.
 */
export function handleValidationError(err) {
  if (err instanceof ZodError) {
    throw new ValidationError('Dados inválidos', err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })));
  }
  throw new ValidationError(err.message);
}
