import { createFolder } from "@/lib/sharepoint";
import { z } from "zod";

const Schema = z.object({
  folderName: z.string().min(1).max(255),
  parentPath: z.string().optional(),
});

export async function POST(req: Request) {
  try {
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
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
