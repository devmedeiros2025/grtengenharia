const levels = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = levels[process.env.LOG_LEVEL] ?? levels.info;
const isProduction = process.env.NODE_ENV === 'production';

function timestamp() {
  return new Date().toISOString();
}

/**
 * Cria um logger com suporte a formato JSON estruturado (produção)
 * e texto simples (desenvolvimento).
 *
 * Uso:
 *   logger.info('mensagem', { extra: 'dados' });
 *   const child = logger.child({ requestId: 'abc' });
 *   child.info('request started');
 */
function createLogger(context = {}) {
  function log(level, ...args) {
    if (levels[level] > currentLevel) return;

    const message = typeof args[0] === 'string' ? args[0] : '';
    const extra = args.length > 1 ? args.slice(1) : [];

    if (isProduction) {
      const entry = {
        timestamp: timestamp(),
        level: level.toUpperCase(),
        message,
        ...context,
        ...(extra.length > 0 ? { data: extra } : {}),
      };
      const output = JSON.stringify(entry);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const prefix = context.requestId
        ? `[${timestamp()}] [${level.toUpperCase()}] [${context.requestId}]`
        : `[${timestamp()}] [${level.toUpperCase()}]`;
      const consoleFn = level === 'error' ? console.error
        : level === 'warn' ? console.warn
        : level === 'debug' ? console.debug
        : console.log;
      consoleFn(prefix, message, ...extra);
    }
  }

  return {
    error: (...args) => log('error', ...args),
    warn: (...args) => log('warn', ...args),
    info: (...args) => log('info', ...args),
    debug: (...args) => log('debug', ...args),
    child: (newContext) => createLogger({ ...context, ...newContext }),
  };
}

export const logger = createLogger();
