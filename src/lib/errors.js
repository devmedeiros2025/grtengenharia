/**
 * Erros tipados da aplicação.
 *
 * Uso:
 *   throw new NotFoundError('Lead não encontrado');
 *   throw new ValidationError('Dados inválidos', details);
 *   throw new AuthError('Token inválido');
 */

export class AppError extends Error {
  /**
   * @param {string} message - Mensagem legível
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Código interno do erro (ex: 'NOT_FOUND')
   * @param {*} [details] - Dados adicionais do erro
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Não autorizado', details = null) {
    super(message, 401, 'AUTH_ERROR', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso proibido', details = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente em instantes.') {
    super(message, 429, 'RATE_LIMIT');
  }
}
