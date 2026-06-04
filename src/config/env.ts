import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  COOKIE_SECRET: required('COOKIE_SECRET'),
  SUPER_ADMIN_EMAIL: optional('SUPER_ADMIN_EMAIL', 'admin@kajkarma.com'),
  SUPER_ADMIN_PASSWORD: optional('SUPER_ADMIN_PASSWORD', 'Admin@123456'),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
  ENCRYPTION_KEY: required('ENCRYPTION_KEY'),
  DAILY_REMINDER_DIGEST_EMAIL: process.env['DAILY_REMINDER_DIGEST_EMAIL'] ?? '',
  SMTP_HOST: process.env['SMTP_HOST'] ?? '',
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_SECURE: optional('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: process.env['SMTP_USER'] ?? '',
  SMTP_PASSWORD: process.env['SMTP_PASSWORD'] ?? '',
  SMTP_FROM_EMAIL: optional('SMTP_FROM_EMAIL', 'noreply@kajkarma.com'),
  isDev: () => env.NODE_ENV === 'development',
  isProd: () => env.NODE_ENV === 'production',
} as const;
