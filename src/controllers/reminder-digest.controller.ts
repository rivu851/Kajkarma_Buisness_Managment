import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getDigestPreview } from '../services/reminder-digest.service.js';

export const getDigestPreviewHandler: RequestHandler = asyncHandler(async (req, res) => {
  const digest = await getDigestPreview(req.user!);
  sendSuccess(res, digest, 'Digest preview retrieved');
});
