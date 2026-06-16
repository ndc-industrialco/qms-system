import { requireAuth } from "@/lib/auth";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const repo = new NotificationRepository();

export async function PATCH() {
  try {
    const session = await requireAuth();
    await repo.markAllRead(session.user.id);
    return sendSuccess({}, "All marked as read");
  } catch (err) {
    return handleApiError(err);
  }
}
