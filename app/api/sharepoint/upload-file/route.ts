export const runtime = 'nodejs';

import { uploadFile } from "@/lib/sharepoint";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderPath = (formData.get("folderPath") as string | null) ?? "root";

    if (!file) {
      return Response.json({ data: null, error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await uploadFile(file.name, buffer, folderPath);

    return Response.json({ data: uploaded, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
