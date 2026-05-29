import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { createMonthlyReportSchema, monthlyQuerySchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const query = monthlyQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await service.listReports({ page: query.page ?? 1, limit: query.limit ?? 20, year: query.year, month: query.month, status: query.status, department: undefined });
    return sendSuccess(result.data, 'Monthly reports retrieved successfully', 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = createMonthlyReportSchema.omit({ kpiId: true }).parse(await request.json());
    const report = await service.createMonthlyReport(
      { ...body, kpiId: id },
      { userId: session.user.id, role: session.user.role, departmentId: session.user.departmentId }
    );
    return sendSuccess(report, 'Monthly report created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
