import { Salary } from '../models/salary.model.js';
import type { ISalary } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface SalaryListFilters {
  employee_id?: string;
  month?: number;
  year?: number;
  status?: string;
}

export async function findAllSalaries(
  page: number,
  limit: number,
  filters: SalaryListFilters
): Promise<PaginatedResult<ISalary>> {
  const query: Record<string, unknown> = {};

  if (filters.employee_id) query['employee_id'] = filters.employee_id;
  if (filters.month) query['month'] = filters.month;
  if (filters.year) query['year'] = filters.year;
  if (filters.status) query['status'] = filters.status;

  const [data, total] = await Promise.all([
    Salary.find(query)
      .populate('employee_id', 'full_name department role_designation')
      .populate('paid_by', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ year: -1, month: -1 })
      .lean(),
    Salary.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSalaryById(id: string | Types.ObjectId): Promise<ISalary | null> {
  return Salary.findById(id)
    .populate('employee_id', 'full_name department role_designation email')
    .populate('paid_by', 'name email')
    .lean();
}

export async function findSalaryByEmployeeAndPeriod(
  employeeId: string | Types.ObjectId,
  month: number,
  year: number
): Promise<ISalary | null> {
  return Salary.findOne({ employee_id: employeeId, month, year }).lean();
}

export async function createSalary(data: Partial<ISalary>): Promise<ISalary> {
  const salary = new Salary(data);
  return (await salary.save()).toObject() as ISalary;
}

export async function updateSalaryById(
  id: string | Types.ObjectId,
  data: Partial<ISalary>
): Promise<ISalary | null> {
  return Salary.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('employee_id', 'full_name department role_designation')
    .populate('paid_by', 'name email')
    .lean();
}

export async function deleteSalaryById(id: string | Types.ObjectId): Promise<ISalary | null> {
  return Salary.findByIdAndDelete(id).lean();
}
