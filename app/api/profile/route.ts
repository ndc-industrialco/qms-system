import { requireAuth } from "@/lib/auth";
import { UserRepository } from "@/repositories/userRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { SignatureType } from "@/generated/prisma/client";

const userRepo = new UserRepository();

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await userRepo.findById(session.user.id);
    if (!user) throw new Error("User not found");

    return sendSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      position: user.position,
      departmentId: user.departmentId,
      savedSignatureUrl: user.savedSignatureUrl,
      signatureType: user.signatureType,
      image: user.image,
      role: user.role,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  position: z.string().max(255).optional().nullable(),
  savedSignatureUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid signature format")
    .max(524288)
    .optional()
    .nullable(),
  signatureType: z.enum(["DRAW", "TYPE", "IMAGE"]).optional().nullable(),
  clearSignature: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    const updateData: { name?: string; position?: string | null; savedSignatureUrl?: string | null; signatureType?: SignatureType | null } = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.position !== undefined) updateData.position = parsed.position;

    if (parsed.clearSignature) {
      updateData.savedSignatureUrl = null;
      updateData.signatureType = null;
    } else if (parsed.savedSignatureUrl !== undefined) {
      updateData.savedSignatureUrl = parsed.savedSignatureUrl;
      updateData.signatureType = (parsed.signatureType ?? null) as SignatureType | null;
    }

    const user = await userRepo.updateProfile(session.user.id, updateData);

    return sendSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      position: user.position,
      departmentId: user.departmentId,
      savedSignatureUrl: user.savedSignatureUrl,
      signatureType: user.signatureType,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
