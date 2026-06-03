import {
  findAllCommunications,
  findCommunicationById,
  createCommunication,
  updateCommunicationById,
  deleteCommunicationById,
} from '../repositories/communication.repository.js';
import { findLeadById } from '../repositories/lead.repository.js';
import { findClientById } from '../repositories/client.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import {
  communicationListScope,
  hasFullRecordAccess,
  toObjectId,
  resolveId,
} from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { ICommunication } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';
import type { EntityType } from '../constants/enums.js';

async function assertEntityAccess(
  entityType: EntityType,
  entityId: string,
  user: JwtPayload
): Promise<void> {
  if (hasFullRecordAccess(user)) return;

  if (entityType === 'lead') {
    const lead = await findLeadById(entityId);
    if (!lead) throw new AppError('Lead not found', 404);
    if (
      user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE &&
      resolveId(lead.assigned_user_id) !== user.userId
    ) {
      throw new AppError('Access denied to this lead', 403);
    }
  } else {
    const client = await findClientById(entityId);
    if (!client) throw new AppError('Client not found', 404);
    if (
      user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE &&
      resolveId(client.assigned_manager_id) !== user.userId
    ) {
      throw new AppError('Access denied to this client', 403);
    }
  }
}

function assertCommunicationRecordAccess(comm: ICommunication, user: JwtPayload): void {
  if (hasFullRecordAccess(user)) return;
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    if (resolveId(comm.user_id) !== user.userId) {
      throw new AppError('Access denied to this communication', 403);
    }
  }
}

export async function listCommunications(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: {
    entity_type?: string;
    entity_id?: string;
    type?: string;
    user_id?: string;
  }
): Promise<PaginatedResult<ICommunication>> {
  if (filters.entity_type && filters.entity_id) {
    await assertEntityAccess(filters.entity_type as EntityType, filters.entity_id, user);
  }

  return findAllCommunications(page, limit, {
    ...omitUndefined({
      entity_type: filters.entity_type,
      entity_id: filters.entity_id,
      type: filters.type,
      user_id: filters.user_id,
    }),
    scope: communicationListScope(user),
  });
}

export async function getCommunicationById(id: string, user: JwtPayload): Promise<ICommunication> {
  const comm = await findCommunicationById(id);
  if (!comm) throw new AppError('Communication not found', 404);
  assertCommunicationRecordAccess(comm, user);
  return comm;
}

export async function createNewCommunication(
  data: {
    entity_type: EntityType;
    entity_id: string;
    date?: Date;
    type: string;
    notes?: string;
    outcome?: string;
    next_follow_up_date?: Date;
  },
  user: JwtPayload
): Promise<ICommunication> {
  await assertEntityAccess(data.entity_type, data.entity_id, user);

  const comm = await createCommunication(
    omitUndefined({
      entity_type: data.entity_type,
      entity_id: toObjectId(data.entity_id),
      user_id: toObjectId(user.userId),
      date: data.date ?? new Date(),
      type: data.type as ICommunication['type'],
      notes: data.notes,
      outcome: data.outcome,
      next_follow_up_date: data.next_follow_up_date,
    }) as Partial<ICommunication>
  );

  return (await findCommunicationById(comm._id))!;
}

export async function updateCommunication(
  id: string,
  data: Partial<ICommunication>,
  user: JwtPayload
): Promise<ICommunication> {
  const existing = await findCommunicationById(id);
  if (!existing) throw new AppError('Communication not found', 404);
  assertCommunicationRecordAccess(existing, user);

  const updated = await updateCommunicationById(id, data);
  if (!updated) throw new AppError('Communication not found', 404);
  return updated;
}

export async function removeCommunication(id: string, user: JwtPayload): Promise<void> {
  const existing = await findCommunicationById(id);
  if (!existing) throw new AppError('Communication not found', 404);
  assertCommunicationRecordAccess(existing, user);
  const deleted = await deleteCommunicationById(id);
  if (!deleted) throw new AppError('Communication not found', 404);
}
