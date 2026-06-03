import {
  findAllClients,
  findClientById,
  createClient,
  updateClientById,
  deleteClientById,
} from '../repositories/client.repository.js';
import { findLeadById } from '../repositories/lead.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { clientListScope, hasFullRecordAccess, toObjectId, resolveId } from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { IClient } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

function assertClientRecordAccess(client: IClient, user: JwtPayload): void {
  if (hasFullRecordAccess(user)) return;
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    if (resolveId(client.assigned_manager_id) !== user.userId) {
      throw new AppError('Access denied to this client', 403);
    }
  }
}

export async function listClients(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: {
    status?: string;
    assigned_manager_id?: string;
    sector?: string;
    search?: string;
  }
): Promise<PaginatedResult<IClient>> {
  return findAllClients(
    page,
    limit,
    {
      ...omitUndefined({
        status: filters.status,
        assigned_manager_id: filters.assigned_manager_id,
        sector: filters.sector,
      }),
      scope: clientListScope(user),
    },
    filters.search
  );
}

export async function getClientById(id: string, user: JwtPayload): Promise<IClient> {
  const client = await findClientById(id);
  if (!client) throw new AppError('Client not found', 404);
  assertClientRecordAccess(client, user);
  return client;
}

export async function createNewClient(
  data: Partial<IClient>,
  user: JwtPayload
): Promise<IClient> {
  if (data.source_lead_id) {
    const lead = await findLeadById(data.source_lead_id.toString());
    if (!lead) throw new AppError('Source lead not found', 404);
  }

  if (data.assigned_manager_id) {
    const manager = await findUserById(data.assigned_manager_id.toString());
    if (!manager) throw new AppError('Assigned manager not found', 404);
  }

  const managerId = data.assigned_manager_id ?? toObjectId(user.userId);

  const client = await createClient(
    omitUndefined({
      ...data,
      email: data.email || undefined,
      assigned_manager_id: managerId as IClient['assigned_manager_id'],
      social_media_links: data.social_media_links ?? {},
    }) as Partial<IClient>
  );

  return (await findClientById(client._id))!;
}

export async function updateClient(
  id: string,
  data: Partial<IClient>,
  user: JwtPayload
): Promise<IClient> {
  const existing = await findClientById(id);
  if (!existing) throw new AppError('Client not found', 404);
  assertClientRecordAccess(existing, user);

  if (data.assigned_manager_id) {
    const manager = await findUserById(data.assigned_manager_id.toString());
    if (!manager) throw new AppError('Assigned manager not found', 404);
  }

  const updated = await updateClientById(id, data);
  if (!updated) throw new AppError('Client not found', 404);
  return updated;
}

export async function removeClient(id: string, user: JwtPayload): Promise<void> {
  const existing = await findClientById(id);
  if (!existing) throw new AppError('Client not found', 404);
  assertClientRecordAccess(existing, user);
  const deleted = await deleteClientById(id);
  if (!deleted) throw new AppError('Client not found', 404);
}
