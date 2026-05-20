export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { listFiles } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole("QMS", "MR", "IT");
    const { searchParams } = new URL(req.url);
    const folderPath = searchParams.get("folderPath") ?? "root";

    const files = await listFiles(folderPath);

    return Response.json({ data: files, error: null, meta: { total: files.length } });
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
