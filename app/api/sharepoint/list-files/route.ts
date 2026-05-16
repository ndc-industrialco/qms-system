import { listFiles } from "@/lib/sharepoint";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderPath = searchParams.get("folderPath") ?? "root";

    const files = await listFiles(folderPath);

    return Response.json({ data: files, error: null, meta: { total: files.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
