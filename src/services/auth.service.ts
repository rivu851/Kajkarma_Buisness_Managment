import {
  findUserDocForAuth,
  findUserById,
  updateLastLogin,
  createLoginAudit,
} from '../repositories/user.repository.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import type { AuthTokens, JwtPayload, IRole } from '../types/index.js';
import { User } from '../models/user.model.js';

export async function loginUser(
  email: string,
  password: string,
  ip: string,
  userAgent: string
): Promise<{ tokens: AuthTokens; user: Record<string, unknown> }> {
  const userDoc = await findUserDocForAuth(email);

  if (!userDoc) {
    throw new AppError('Invalid email or password', 401);
  }

  if (userDoc.status !== 'active') {
    throw new AppError('Account is not active. Contact your administrator.', 403);
  }

  const isMatch = await userDoc.comparePassword(password);

  if (!isMatch) {
    await createLoginAudit({ user_id: userDoc._id, ip_address: ip, user_agent: userAgent, status: 'failed' });
    throw new AppError('Invalid email or password', 401);
  }

  await userDoc.populate({ path: 'role_id', select: 'name description' });
  const role = userDoc.role_id as unknown as IRole;

  const payload: JwtPayload = {
    userId: userDoc._id.toString(),
    roleId: role._id?.toString() ?? userDoc.role_id.toString(),
    roleName: role.name ?? '',
  };

  const tokens = generateTokens(payload);

  await Promise.all([
    updateLastLogin(userDoc._id),
    createLoginAudit({ user_id: userDoc._id, ip_address: ip, user_agent: userAgent, status: 'success' }),
  ]);

  const safeUser = userDoc.toObject() as Record<string, unknown>;
  delete safeUser['password'];

  return { tokens, user: safeUser };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const userDoc = await User.findById(payload.userId).select('status role_id').populate({ path: 'role_id', select: 'name' }).exec();

  if (!userDoc || userDoc.status !== 'active') {
    throw new AppError('User account is inactive', 403);
  }

  const role = userDoc.role_id as unknown as IRole;
  const newPayload: JwtPayload = {
    userId: userDoc._id.toString(),
    roleId: role._id?.toString() ?? userDoc.role_id.toString(),
    roleName: role.name ?? '',
  };

  return generateTokens(newPayload);
}

export async function getMe(userId: string): Promise<Record<string, unknown>> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  const safeUser = user as unknown as Record<string, unknown>;
  delete safeUser['password'];
  return safeUser;
}
