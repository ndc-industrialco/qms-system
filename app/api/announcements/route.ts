import { requireRole } from "@/lib/auth";
import { AnnouncementService } from "@/services/announcementService";
import { createAnnouncementSchema } from "@/schemas/announcementSchema";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";

const announcementService = new AnnouncementService();

export async function GET() {
  try {
    await requireRole("QMS", "IT", "MR");
    const result = await announcementService.listAnnouncements();
    return sendSuccess(result, "Announcements retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("QMS", "IT", "MR");
    const formData = await req.formData();

    const rawData = {
      title: formData.get("title"),
      content: formData.get("content"),
      sourceSystem: formData.get("sourceSystem") ?? "QMS",
      displayType: formData.get("displayType"),
      pushToCompanyCenter: formData.get("pushToCompanyCenter") === "true",
      startDate: formData.get("startDate") || null,
      endDate: formData.get("endDate") || null,
      spItemId: formData.get("spItemId") || null,
      spWebUrl: formData.get("spWebUrl") || null,
      spDownloadUrl: formData.get("spDownloadUrl") || null,
      fileName: formData.get("fileName") || null,
      mimeType: formData.get("mimeType") || null,
      bgColor: formData.get("bgColor") || null,
      bgImageUrl: formData.get("bgImageUrl") || null,
      bgImageSpId: formData.get("bgImageSpId") || null,
      textColor: formData.get("textColor") || null,
    };

    const validatedData = createAnnouncementSchema.parse(rawData);

    const parsedStartDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    const parsedEndDate = validatedData.endDate ? new Date(validatedData.endDate) : null;

    let expiryDate: Date | null = parsedEndDate;
    if (validatedData.displayType === "SCROLLING" && !expiryDate) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // SCROLLING_EXPIRY_DAYS = 7
    }

    const result = await announcementService.createAnnouncement(
      {
        ...validatedData,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        expiryDate,
      },
      session.user.id,
      session.user.authUserId ?? null,
      session.user.name ?? null,
    );

    return sendSuccess(result, "Announcement created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
