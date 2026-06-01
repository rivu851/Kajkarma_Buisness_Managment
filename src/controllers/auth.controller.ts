import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { loginUser, refreshTokens, getMe } from '../services/auth.service.js';
import { env } from '../config/env.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.isProd(),
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const ip = req.ip ?? 'unknown';
  const userAgent = req.headers['user-agent'] ?? 'unknown';

  const { tokens, user } = await loginUser(email, password, ip, userAgent);

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTS);

  sendSuccess(res, { accessToken: tokens.accessToken, user }, 'Login successful');
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  sendSuccess(res, null, 'Logged out successfully');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token: string | undefined =
    (req.cookies as Record<string, string | undefined>)['refreshToken'] ??
    (req.body as { refreshToken?: string }).refreshToken;

  if (!token) {
    res.status(401).json({ success: false, message: 'Refresh token required' });
    return;
  }

  const tokens = await refreshTokens(token);

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await getMe(req.user!.userId);
  sendSuccess(res, user, 'User profile retrieved');
});
