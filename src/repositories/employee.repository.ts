import { Employee } from '../models/employee.model.js';
import type { IEmployee } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface EmployeeListFilters {
  status?: string;
  department?: string;
}

export async function findAllEmployees(
  page: number,
  limit: number,
  filters: EmployeeListFilters,
  search?: string
): Promise<PaginatedResult<IEmployee>> {
  const query: Record<string, unknown> = {};

  if (filters.status) query['status'] = filters.status;
  if (filters.department) query['department'] = filters.department;

  if (search) {
    query['$or'] = [
      { full_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    Employee.find(query)
      .populate('user_id', 'name email status')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .lean(),
    Employee.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findEmployeeById(id: string | Types.ObjectId): Promise<IEmployee | null> {
  return Employee.findById(id).populate('user_id', 'name email status').lean();
}

export async function findEmployeeByUserId(
  userId: string | Types.ObjectId
): Promise<IEmployee | null> {
  return Employee.findOne({ user_id: userId }).lean();
}

export async function createEmployee(data: Partial<IEmployee>): Promise<IEmployee> {
  const employee = new Employee(data);
  return (await employee.save()).toObject() as IEmployee;
}

export async function updateEmployeeById(
  id: string | Types.ObjectId,
  data: Partial<IEmployee>
): Promise<IEmployee | null> {
  return Employee.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('user_id', 'name email')
    .lean();
}

export async function deleteEmployeeById(id: string | Types.ObjectId): Promise<IEmployee | null> {
  return Employee.findByIdAndDelete(id).lean();
}

export async function employeeExists(id: string | Types.ObjectId): Promise<boolean> {
  return (await Employee.countDocuments({ _id: id })) > 0;
}
