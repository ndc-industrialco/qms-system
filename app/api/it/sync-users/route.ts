
import { requireRole } from "@/lib/auth";
import { fetchAllEntraUsers } from "@/services/ms-graph";
import { UserService } from "@/services/userService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const userService = new UserService();

/**
 * POST /api/it/sync-users
 *
 * Pulls all M365-licensed member accounts from Microsoft Entra ID and
 * upserts them into the local database. Restricted to IT role.
 */
export async function POST() {
  try {
    const session = await requireRole("IT");

    const entraUsers = await fetchAllEntraUsers();
    const result = await userService.syncEntraUsers(entraUsers, session.user.id);

    return sendSuccess(result, "Users synchronized successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
