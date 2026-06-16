import { requireAuth } from "@/lib/auth";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const repo = new NotificationRepository();

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await repo.findByRecipient(session.user.id, 30);
    const unreadCount = await repo.countUnread(session.user.id);
    return sendSuccess({ notifications, unreadCount }, "OK");
  } catch (err) {
    return handleApiError(err);
  }
}
