
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { deleteItem } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const Schema = z.object({
  itemId: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");
    const parsed = Schema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });

    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    await deleteItem(parsed.data.itemId);

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[DELETE /api/sharepoint/delete-item]", err);
    return NextResponse.json({ data: null, error: "Failed to delete item" }, { status: 500 });
  }
}
