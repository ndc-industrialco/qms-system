export const runtime = 'edge';

import { requireRole } from "@/lib/auth";
import { createFolder } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const Schema = z.object({
  folderName: z.string().min(1).max(255),
  parentPath: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireRole("QMS", "MR", "IT");
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { data: null, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const folder = await createFolder(
      parsed.data.folderName,
      parsed.data.parentPath ?? "root"
    );

    return Response.json({ data: folder, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
