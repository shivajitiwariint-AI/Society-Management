import pino from 'pino';

/** Structured logs with no passwords, tokens or raw PII (SRS 15.4). */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'society-web' },
  redact: {
    paths: ['password', '*.password', 'newPassword', 'token', '*.token', 'passwordHash', 'req.headers.cookie', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
