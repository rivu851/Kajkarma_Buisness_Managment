import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as communicationService from '../services/communication.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getCommunications: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await communicationService.listCommunications(
    Number(q.page ?? 1),
    Number(q.limit ?? 20),
    req.user!,
    {
      ...(q.entity_type ? { entity_type: String(q.entity_type) } : {}),
      ...(q.entity_id ? { entity_id: String(q.entity_id) } : {}),
      ...(q.type ? { type: String(q.type) } : {}),
      ...(q.user_id ? { user_id: String(q.user_id) } : {}),
    }
  );
  sendSuccess(res, result, 'Communications retrieved');
});

export const getCommunication: RequestHandler = asyncHandler(async (req, res: Response) => {
  const comm = await communicationService.getCommunicationById(param(req, 'id'), req.user!);
  sendSuccess(res, comm, 'Communication retrieved');
});

export const createCommunication: RequestHandler = asyncHandler(async (req, res: Response) => {
  const comm = await communicationService.createNewCommunication(req.body, req.user!);
  sendSuccess(res, comm, 'Communication logged', 201);
});

export const updateCommunicationHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const comm = await communicationService.updateCommunication(
      param(req, 'id'),
      req.body,
      req.user!
    );
    sendSuccess(res, comm, 'Communication updated');
  }
);

export const deleteCommunication: RequestHandler = asyncHandler(async (req, res: Response) => {
  await communicationService.removeCommunication(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'Communication deleted');
});
