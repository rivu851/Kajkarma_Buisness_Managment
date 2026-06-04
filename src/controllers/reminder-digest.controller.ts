import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getDigestPreview } from '../services/reminder-digest.service.js';

export const getDigestPreviewHandler: RequestHandler = asyncHandler(async (_req, res) => {
  const digest = await getDigestPreview();
  sendSuccess(res, digest, 'Digest preview retrieved');
});
