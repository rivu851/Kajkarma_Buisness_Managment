import { Client } from '../models/client.model.js';
import type { IClient } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface ClientListFilters {
  status?: string;
  assigned_manager_id?: string;
  sector?: string;
  scope?: Record<string, unknown>;
}

export async function findAllClients(
  page: number,
  limit: number,
  filters: ClientListFilters,
  search?: string
): Promise<PaginatedResult<IClient>> {
  const query: Record<string, unknown> = { ...filters.scope };

  if (filters.status) query['status'] = filters.status;
  if (filters.assigned_manager_id) query['assigned_manager_id'] = filters.assigned_manager_id;
  if (filters.sector) query['sector'] = filters.sector;

  if (search) {
    query['$or'] = [
      { company_name: { $regex: search, $options: 'i' } },
      { contact_person_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone_number: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    Client.find(query)
      .populate('assigned_manager_id', 'name email')
      .populate('source_lead_id', 'lead_name company_name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .lean(),
    Client.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findClientById(id: string | Types.ObjectId): Promise<IClient | null> {
  return Client.findById(id)
    .populate('assigned_manager_id', 'name email')
    .populate('source_lead_id', 'lead_name company_name')
    .lean();
}

export async function createClient(data: Partial<IClient>): Promise<IClient> {
  const client = new Client(data);
  return (await client.save()).toObject() as IClient;
}

export async function updateClientById(
  id: string | Types.ObjectId,
  data: Partial<IClient>
): Promise<IClient | null> {
  return Client.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('assigned_manager_id', 'name email')
    .populate('source_lead_id', 'lead_name')
    .lean();
}

export async function deleteClientById(id: string | Types.ObjectId): Promise<IClient | null> {
  return Client.findByIdAndDelete(id).lean();
}

export async function clientExists(id: string | Types.ObjectId): Promise<boolean> {
  return (await Client.countDocuments({ _id: id })) > 0;
}
