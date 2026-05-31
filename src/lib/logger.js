const levels = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = levels[process.env.LOG_LEVEL] ?? levels.info;

function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  error: (...args) => currentLevel >= levels.error && console.error(`[${timestamp()}] [ERROR]`, ...args),
  warn: (...args) => currentLevel >= levels.warn && console.warn(`[${timestamp()}] [WARN]`, ...args),
  info: (...args) => currentLevel >= levels.info && console.info(`[${timestamp()}] [INFO]`, ...args),
  debug: (...args) => currentLevel >= levels.debug && console.debug(`[${timestamp()}] [DEBUG]`, ...args),
};
