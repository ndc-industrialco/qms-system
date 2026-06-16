import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { listAuthCenterAppMembers, listAuthCenterUsers } from "@/lib/auth-center-admin-client";
import { pickRole } from "@/lib/auth-center-token";
import { db } from "@/lib/db";

const MR_AUTH_CONFIG_KEY = "CURRENT_MR_AUTH_USER_ID";
const QMS_AUTH_CONFIG_KEY = "CURRENT_QMS_AUTH_USER_ID";

export class ApprovalConfigService {
  private configRepo = new SystemConfigRepository();

  async getConfig(accessToken?: string | null) {
    const [authUsers, appMembers, mrConfig, qmsConfig] = await Promise.all([
      listAuthCenterUsers({ accessToken }),
      listAuthCenterAppMembers({ accessToken }),
      this.configRepo.findValueByKey(MR_AUTH_CONFIG_KEY),
      this.configRepo.findValueByKey(QMS_AUTH_CONFIG_KEY),
    ]);

    const authUsersById = new Map(authUsers.map((u) => [u.id, u]));

    const users = appMembers
      .filter((u) => Boolean(u.id))
      .map((member) => {
        const authUser = authUsersById.get(member.id);
        return {
          id: member.id,
          authUserId: member.id,
          name: authUser?.displayName ?? member.displayName ?? null,
          email: authUser?.email ?? member.email ?? null,
          role: pickRole(authUser?.roles ?? []),
          department: authUser?.department ? { id: authUser.department, name: authUser.department } : null,
        };
      });

    return { users, currentMrUserId: mrConfig, currentQmsUserId: qmsConfig };
  }

  async updateConfig(mrAuthUserId: string | null, qmsAuthUserId: string | null) {
    await db.$transaction(async (tx) => {
      if (mrAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(MR_AUTH_CONFIG_KEY, mrAuthUserId, "Auth Center stable key of MR user", tx);
      } else {
        await this.configRepo.deleteByKey(MR_AUTH_CONFIG_KEY, tx);
      }
      if (qmsAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(QMS_AUTH_CONFIG_KEY, qmsAuthUserId, "Auth Center stable key of QMS user", tx);
      } else {
        await this.configRepo.deleteByKey(QMS_AUTH_CONFIG_KEY, tx);
      }
    });
  }
}
