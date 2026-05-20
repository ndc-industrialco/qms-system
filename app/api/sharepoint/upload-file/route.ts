export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { uploadFile } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await requireRole("QMS", "MR", "IT");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderPath = (formData.get("folderPath") as string | null) ?? "root";

    if (!file) {
      return Response.json({ data: null, error: "No file provided" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    const uploaded = await uploadFile(file.name, buffer, folderPath);

    return Response.json({ data: uploaded, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
