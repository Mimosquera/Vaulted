const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const ACTIVE_LEVEL = process.env.LOG_LEVEL?.toLowerCase() || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const ACTIVE_WEIGHT = LOG_LEVELS[ACTIVE_LEVEL] ?? LOG_LEVELS.info;

function shouldLog(level) {
  return (LOG_LEVELS[level] ?? LOG_LEVELS.info) >= ACTIVE_WEIGHT;
}

function safeSerialize(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { serializationError: true };
  }
}

function redactObject(input) {
  if (!input || typeof input !== 'object') return input;

  const redactKeys = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'password',
    'token',
    'refreshToken',
    'jwt',
    'secret',
  ]);

  const output = Array.isArray(input) ? [] : {};
  for (const [key, value] of Object.entries(input)) {
    const lowered = key.toLowerCase();
    if (redactKeys.has(lowered)) {
      output[key] = '[REDACTED]';
      continue;
    }

    if (value && typeof value === 'object') {
      output[key] = redactObject(value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function log(level, message, meta = {}) {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeSerialize(redactObject(meta)),
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

export function logInfo(message, meta) {
  log('info', message, meta);
}

export function logWarn(message, meta) {
  log('warn', message, meta);
}

export function logError(message, meta) {
  log('error', message, meta);
}

export function requestLogger(req, res, next) {
  const logBody = process.env.LOG_REQUEST_BODY === 'true';
  const startedAt = req.requestStart || Date.now();

  logInfo('request.start', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
    headers: {
      'x-forwarded-for': req.get('x-forwarded-for') || null,
      origin: req.get('origin') || null,
    },
    body: logBody ? req.body : undefined,
  });

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    log(level, 'request.finish', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      durationMs,
      contentLength: res.getHeader('content-length') || null,
      userId: req.userId || null,
    });
  });

  next();
}
