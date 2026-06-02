import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as clientService from '../services/client.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getClients: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await clientService.listClients(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.status ? { status: String(q.status) } : {}),
    ...(q.assigned_manager_id ? { assigned_manager_id: String(q.assigned_manager_id) } : {}),
    ...(q.sector ? { sector: String(q.sector) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
  });
  sendSuccess(res, result, 'Clients retrieved');
});

export const getClient: RequestHandler = asyncHandler(async (req, res: Response) => {
  const client = await clientService.getClientById(param(req, 'id'), req.user!);
  sendSuccess(res, client, 'Client retrieved');
});

export const createClient: RequestHandler = asyncHandler(async (req, res: Response) => {
  const client = await clientService.createNewClient(req.body, req.user!);
  sendSuccess(res, client, 'Client created', 201);
});

export const updateClientHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const client = await clientService.updateClient(param(req, 'id'), req.body, req.user!);
  sendSuccess(res, client, 'Client updated');
});

export const deleteClient: RequestHandler = asyncHandler(async (req, res: Response) => {
  await clientService.removeClient(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'Client deleted');
});
