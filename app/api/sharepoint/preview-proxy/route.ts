
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileInfo } from "@/lib/sharepoint";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { z } from "zod";

const querySchema = z.object({
  itemId: z.string().min(1).max(200),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const parsed = querySchema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });
    if (!parsed.success) {
      throw new ValidationError("itemId is required and must be a valid identifier");
    }
    const { itemId } = parsed.data;

    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR" || session.user.role === "IT";

    if (!isPrivileged) {
      const attachment = await db.darAttachment.findFirst({
        where: { spItemId: itemId },
        select: { darMasterId: true },
      });

      if (!attachment) {
        throw new NotFoundError("File");
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
          throw new ForbiddenError();
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
    return handleApiError(err);
  }
}
