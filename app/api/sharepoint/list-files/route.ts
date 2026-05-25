
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listFiles } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");
    const folderPath = req.nextUrl.searchParams.get("folderPath") ?? "root";

    const files = await listFiles(folderPath);

    return NextResponse.json({ data: files, error: null, meta: { total: files.length } });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/sharepoint/list-files]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
