export const runtime = 'edge';

import { requireAuth } from "@/lib/auth";
import { getFileInfo } from "@/lib/sharepoint";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return new Response("itemId is required", { status: 400 });
    }

    const info = await getFileInfo(itemId);

    if (!info.downloadUrl) {
      return new Response("No download URL available", { status: 502 });
    }

    const upstream = await fetch(info.downloadUrl, {
      headers: { Accept: "*/*" },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": info.mimeType || upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(info.name)}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[preview-proxy]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(message, { status: 500 });
  }
}
