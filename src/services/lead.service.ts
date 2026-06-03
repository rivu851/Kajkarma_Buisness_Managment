import { Types } from 'mongoose';
import {
  findAllLeads,
  findLeadById,
  createLead,
  updateLeadById,
  deleteLeadById,
  pushLeadHistory,
} from '../repositories/lead.repository.js';
import { createClient } from '../repositories/client.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { leadListScope, hasFullRecordAccess, toObjectId, resolveId } from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { ILead } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';
import type { LeadStage } from '../constants/enums.js';

function assertLeadRecordAccess(lead: ILead, user: JwtPayload): void {
  if (hasFullRecordAccess(user)) return;
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    if (resolveId(lead.assigned_user_id) !== user.userId) {
      throw new AppError('Access denied to this lead', 403);
    }
  }
}

export async function listLeads(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: {
    stage?: string;
    status?: string;
    assigned_user_id?: string;
    source?: string;
    search?: string;
  }
): Promise<PaginatedResult<ILead>> {
  return findAllLeads(
    page,
    limit,
    {
      ...omitUndefined({
        stage: filters.stage,
        status: filters.status,
        assigned_user_id: filters.assigned_user_id,
        source: filters.source,
      }),
      scope: leadListScope(user),
    },
    filters.search
  );
}

export async function getLeadById(id: string, user: JwtPayload): Promise<ILead> {
  const lead = await findLeadById(id);
  if (!lead) throw new AppError('Lead not found', 404);
  assertLeadRecordAccess(lead, user);
  return lead;
}

export async function createNewLead(
  data: {
    lead_name: string;
    phone_number?: string;
    email?: string;
    company_name?: string;
    sector?: string;
    source: string;
    stage?: string;
    status?: string;
    tags?: string[];
    notes?: string;
    follow_up_date?: Date;
    assigned_user_id?: string;
  },
  user: JwtPayload
): Promise<ILead> {
  const assignedId = data.assigned_user_id ?? user.userId;
  if (data.assigned_user_id) {
    const assignee = await findUserById(data.assigned_user_id);
    if (!assignee) throw new AppError('Assigned user not found', 404);
  }

  const lead = await createLead({
    ...data,
    email: data.email || undefined,
    assigned_user_id: toObjectId(assignedId),
    created_by: toObjectId(user.userId),
    history: [
      {
        action: 'created',
        note: 'Lead created',
        changed_by: toObjectId(user.userId),
        changed_at: new Date(),
      },
    ],
  } as Partial<ILead>);

  const saved = (await findLeadById(lead._id))!;
  if (saved.follow_up_date && saved.assigned_user_id) {
    const { onLeadFollowUpChanged } = await import('./reminder.service.js');
    void onLeadFollowUpChanged(
      saved._id as import('mongoose').Types.ObjectId,
      saved.lead_name,
      saved.follow_up_date,
      saved.assigned_user_id as import('mongoose').Types.ObjectId,
      toObjectId(user.userId)
    ).catch(() => undefined);
  }
  return saved;
}

export async function updateLead(
  id: string,
  data: Partial<ILead>,
  user: JwtPayload
): Promise<ILead> {
  const existing = await findLeadById(id);
  if (!existing) throw new AppError('Lead not found', 404);
  assertLeadRecordAccess(existing, user);

  const updated = await updateLeadById(id, data);
  if (!updated) throw new AppError('Lead not found', 404);
  if (updated.stage === 'won' || updated.stage === 'lost') {
    const { closePendingRemindersForRecord } = await import('./reminder.service.js');
    void closePendingRemindersForRecord('leads', toObjectId(id)).catch(() => undefined);
  } else if (updated.follow_up_date && updated.assigned_user_id) {
    const { onLeadFollowUpChanged } = await import('./reminder.service.js');
    void onLeadFollowUpChanged(
      updated._id as import('mongoose').Types.ObjectId,
      updated.lead_name,
      updated.follow_up_date,
      updated.assigned_user_id as import('mongoose').Types.ObjectId,
      toObjectId(user.userId)
    ).catch(() => undefined);
  }
  return updated;
}

export async function changeLeadStage(
  id: string,
  stage: LeadStage,
  user: JwtPayload,
  note?: string
): Promise<ILead> {
  const existing = await findLeadById(id);
  if (!existing) throw new AppError('Lead not found', 404);
  assertLeadRecordAccess(existing, user);

  await pushLeadHistory(id, {
    action: `stage_changed_to_${stage}`,
    note: note ?? `Stage changed from ${existing.stage} to ${stage}`,
    changed_by: toObjectId(user.userId),
    changed_at: new Date(),
  });

  const updated = await updateLeadById(id, { stage });
  if (!updated) throw new AppError('Lead not found', 404);
  if (stage === 'won' || stage === 'lost') {
    const { closePendingRemindersForRecord } = await import('./reminder.service.js');
    void closePendingRemindersForRecord('leads', toObjectId(id)).catch(() => undefined);
  }
  return updated;
}

export async function assignLead(
  id: string,
  assignedUserId: string,
  user: JwtPayload
): Promise<ILead> {
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    throw new AppError('Sales executives cannot reassign leads', 403);
  }

  const existing = await findLeadById(id);
  if (!existing) throw new AppError('Lead not found', 404);

  const assignee = await findUserById(assignedUserId);
  if (!assignee) throw new AppError('Assigned user not found', 404);

  await pushLeadHistory(id, {
    action: 'assigned',
    note: `Lead assigned to user ${assignedUserId}`,
    changed_by: toObjectId(user.userId),
    changed_at: new Date(),
  });

  const updated = await updateLeadById(id, {
    assigned_user_id: toObjectId(assignedUserId),
  });
  if (!updated) throw new AppError('Lead not found', 404);
  return updated;
}

export async function addLeadNote(
  id: string,
  note: string,
  user: JwtPayload
): Promise<ILead> {
  const existing = await findLeadById(id);
  if (!existing) throw new AppError('Lead not found', 404);
  assertLeadRecordAccess(existing, user);

  await pushLeadHistory(id, {
    action: 'note_added',
    note,
    changed_by: toObjectId(user.userId),
    changed_at: new Date(),
  });

  const updated = await updateLeadById(id, { notes: note });
  if (!updated) throw new AppError('Lead not found', 404);
  return updated;
}

export async function convertLeadToClient(
  id: string,
  user: JwtPayload
): Promise<{ lead: ILead; client: unknown }> {
  const lead = await findLeadById(id);
  if (!lead) throw new AppError('Lead not found', 404);
  assertLeadRecordAccess(lead, user);

  if (lead.client_id) throw new AppError('Lead has already been converted to a client', 422);
  if (lead.stage !== 'won') {
    throw new AppError('Lead must be in "won" stage before conversion', 422);
  }

  const client = await createClient(
    omitUndefined({
      company_name: lead.company_name ?? lead.lead_name,
      contact_person_name: lead.lead_name,
      email: lead.email,
      phone_number: lead.phone_number,
      sector: lead.sector,
      status: 'active' as const,
      assigned_manager_id: lead.assigned_user_id ?? toObjectId(user.userId),
      source_lead_id: lead._id as Types.ObjectId,
      notes: lead.notes,
    }) as Partial<import('../types/business.js').IClient>
  );

  await pushLeadHistory(id, {
    action: 'converted_to_client',
    note: `Converted to client ${client._id}`,
    changed_by: toObjectId(user.userId),
    changed_at: new Date(),
  });

  const updatedLead = await updateLeadById(id, {
    client_id: client._id,
    converted_at: new Date(),
    stage: 'won',
  });

  return { lead: updatedLead!, client };
}

export async function removeLead(id: string, user: JwtPayload): Promise<void> {
  const existing = await findLeadById(id);
  if (!existing) throw new AppError('Lead not found', 404);
  assertLeadRecordAccess(existing, user);
  const deleted = await deleteLeadById(id);
  if (!deleted) throw new AppError('Lead not found', 404);
}
