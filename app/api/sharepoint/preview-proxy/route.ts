
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import { getFileInfo } from "@/lib/sharepoint";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const itemId = req.nextUrl.searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

    if (!isPrivileged) {
      const attachment = await db.darAttachment.findFirst({
        where: { spItemId: itemId },
        select: { darMasterId: true },
      });

      if (!attachment) {
        return NextResponse.json({ data: null, error: "File not found" }, { status: 404 });
      }

      const darRow = await db.darMaster.findUnique({
        where: { id: attachment.darMasterId },
        select: { requesterId: true },
      });

      const isRequester = darRow?.requesterId === session.user.id;
      if (!isRequester) {
        const assigned = await db.darApproval.findFirst({
          where: { darMasterId: attachment.darMasterId, assignedUserId: session.user.id },
          select: { id: true },
        });

        if (!assigned) {
          return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const info = await getFileInfo(itemId);

    if (!info.downloadUrl) {
      return NextResponse.json({ data: null, error: "File not available" }, { status: 502 });
    }

    const upstream = await fetch(info.downloadUrl, {
      headers: { Accept: "*/*" },
    });

    if (!upstream.ok) {
      return NextResponse.json({ data: null, error: "Failed to retrieve file" }, { status: 502 });
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
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[preview-proxy]", err);
    return NextResponse.json({ data: null, error: "Failed to retrieve file" }, { status: 500 });
  }
}
