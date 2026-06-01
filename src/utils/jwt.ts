import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload, AuthTokens } from '../types/index.js';

export function signAccessToken(payload: JwtPayload): string {
  // exactOptionalPropertyTypes + ms.StringValue mismatch — env values are valid JWT durations
  const opts = { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as unknown as jwt.SignOptions;
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(payload: JwtPayload): string {
  const opts = { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as unknown as jwt.SignOptions;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function generateTokens(payload: JwtPayload): AuthTokens {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
