import { Communication } from '../models/communication.model.js';
import type { ICommunication } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface CommunicationListFilters {
  entity_type?: string;
  entity_id?: string;
  type?: string;
  user_id?: string;
  scope?: Record<string, unknown>;
}

export async function findAllCommunications(
  page: number,
  limit: number,
  filters: CommunicationListFilters
): Promise<PaginatedResult<ICommunication>> {
  const query: Record<string, unknown> = { ...filters.scope };

  if (filters.entity_type) query['entity_type'] = filters.entity_type;
  if (filters.entity_id) query['entity_id'] = filters.entity_id;
  if (filters.type) query['type'] = filters.type;
  if (filters.user_id) query['user_id'] = filters.user_id;

  const [data, total] = await Promise.all([
    Communication.find(query)
      .populate('user_id', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1 })
      .lean(),
    Communication.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findCommunicationById(
  id: string | Types.ObjectId
): Promise<ICommunication | null> {
  return Communication.findById(id).populate('user_id', 'name email').lean();
}

export async function createCommunication(data: Partial<ICommunication>): Promise<ICommunication> {
  const doc = new Communication(data);
  return (await doc.save()).toObject() as ICommunication;
}

export async function updateCommunicationById(
  id: string | Types.ObjectId,
  data: Partial<ICommunication>
): Promise<ICommunication | null> {
  const setFields: Record<string, unknown> = {};
  const unsetFields: Record<string, 1> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      unsetFields[key] = 1;
    } else {
      setFields[key] = value;
    }
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(setFields).length) update['$set'] = setFields;
  if (Object.keys(unsetFields).length) update['$unset'] = unsetFields;

  return Communication.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate('user_id', 'name email')
    .lean();
}

export async function deleteCommunicationById(
  id: string | Types.ObjectId
): Promise<ICommunication | null> {
  return Communication.findByIdAndDelete(id).lean();
}
