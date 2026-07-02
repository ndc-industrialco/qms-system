import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { listAuthCenterAppMembers, listAuthCenterUsers, listAuthCenterRoleGrants } from "@/lib/auth-center-admin-client";
import { pickRole } from "@/lib/auth-center-token";
import { db } from "@/lib/db";

const MR_AUTH_CONFIG_KEY  = "CURRENT_MR_AUTH_USER_ID";
const MR_EMAIL_CONFIG_KEY = "CURRENT_MR_EMAIL";
const QMS_AUTH_CONFIG_KEY  = "CURRENT_QMS_AUTH_USER_ID";
const QMS_EMAIL_CONFIG_KEY = "CURRENT_QMS_EMAIL";

const DAR_QMS_AUTH_CONFIG_KEY = "DAR_QMS_AUTH_USER_ID";
const DAR_QMS_EMAIL_CONFIG_KEY = "DAR_QMS_EMAIL";
const CAR_QMS_AUTH_CONFIG_KEY = "CAR_QMS_AUTH_USER_ID";
const CAR_QMS_EMAIL_CONFIG_KEY = "CAR_QMS_EMAIL";

const DAR_MR_CONFIG_KEY = "DAR_MR_AUTH_USER_ID";
const DAR_MR_EMAIL_CONFIG_KEY = "DAR_MR_EMAIL";
const CAR_MR_CONFIG_KEY = "CAR_MR_AUTH_USER_ID";
const CAR_MR_EMAIL_CONFIG_KEY = "CAR_MR_EMAIL";

export class ApprovalConfigService {
  private configRepo = new SystemConfigRepository();

  async getConfig(accessToken?: string | null) {
    const [
      appMembers,
      mrConfig,
      qmsConfig,
      darQmsConfig,
      carQmsConfig,
      darMrConfig,
      carMrConfig,
      mrEmail,
      qmsEmail,
      darQmsEmail,
      carQmsEmail,
      darMrEmail,
      carMrEmail,
    ] = await Promise.all([
      listAuthCenterAppMembers({ accessToken }),
      this.configRepo.findValueByKey(MR_AUTH_CONFIG_KEY),
      this.configRepo.findValueByKey(QMS_AUTH_CONFIG_KEY),
      this.configRepo.findValueByKey(DAR_QMS_AUTH_CONFIG_KEY),
      this.configRepo.findValueByKey(CAR_QMS_AUTH_CONFIG_KEY),
      this.configRepo.findValueByKey(DAR_MR_CONFIG_KEY),
      this.configRepo.findValueByKey(CAR_MR_CONFIG_KEY),
      this.configRepo.findValueByKey(MR_EMAIL_CONFIG_KEY),
      this.configRepo.findValueByKey(QMS_EMAIL_CONFIG_KEY),
      this.configRepo.findValueByKey(DAR_QMS_EMAIL_CONFIG_KEY),
      this.configRepo.findValueByKey(CAR_QMS_EMAIL_CONFIG_KEY),
      this.configRepo.findValueByKey(DAR_MR_EMAIL_CONFIG_KEY),
      this.configRepo.findValueByKey(CAR_MR_EMAIL_CONFIG_KEY),
    ]);

    // IT: full roles per user; QMS/MR: merge role-grants
    const rolesByUser = new Map<string, string[]>();
    try {
      const authUsers = await listAuthCenterUsers({ accessToken });
      for (const u of authUsers) rolesByUser.set(u.id, u.roles);
    } catch {
      const grants = await listAuthCenterRoleGrants({ accessToken });
      for (const g of grants) {
        const list = rolesByUser.get(g.userId) ?? [];
        list.push(g.role);
        rolesByUser.set(g.userId, list);
      }
    }

    const users = appMembers
      .filter((u) => Boolean(u.id))
      .map((member) => ({
        id: member.id,
        authUserId: member.id,
        name: member.displayName ?? null,
        email: member.email ?? null,
        role: pickRole(rolesByUser.get(member.id) ?? []),
        department: null,
      }));

    return {
      users,
      currentMrUserId: mrConfig,
      currentQmsUserId: qmsConfig,
      darQmsUserId: darQmsConfig,
      carQmsUserId: carQmsConfig,
      darMrUserId: darMrConfig,
      carMrUserId: carMrConfig,
      currentMrEmail: mrEmail,
      currentQmsEmail: qmsEmail,
      darQmsEmail: darQmsEmail,
      carQmsEmail: carQmsEmail,
      darMrEmail: darMrEmail,
      carMrEmail: carMrEmail,
    };
  }

  async updateConfig(
    mrAuthUserId: string | null,
    qmsAuthUserId: string | null,
    emails?: { mrEmail?: string | null; qmsEmail?: string | null },
    darQmsAuthUserId?: string | null,
    carQmsAuthUserId?: string | null,
    moduleEmails?: {
      darQmsEmail?: string | null;
      carQmsEmail?: string | null;
      darMrEmail?: string | null;
      carMrEmail?: string | null;
    },
    darMrAuthUserId?: string | null,
    carMrAuthUserId?: string | null,
  ) {
    await db.$transaction(async (tx) => {
      if (mrAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(MR_AUTH_CONFIG_KEY, mrAuthUserId, "Auth Center stable key of MR user", tx);
      } else {
        await this.configRepo.deleteByKey(MR_AUTH_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(MR_EMAIL_CONFIG_KEY, tx);
      }
      if (emails?.mrEmail) {
        await this.configRepo.upsertConfigWithDescription(MR_EMAIL_CONFIG_KEY, emails.mrEmail, "Email address of current MR user", tx);
      }

      if (qmsAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(QMS_AUTH_CONFIG_KEY, qmsAuthUserId, "Auth Center stable key of QMS user", tx);
      } else {
        await this.configRepo.deleteByKey(QMS_AUTH_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(QMS_EMAIL_CONFIG_KEY, tx);
      }
      if (emails?.qmsEmail) {
        await this.configRepo.upsertConfigWithDescription(QMS_EMAIL_CONFIG_KEY, emails.qmsEmail, "Email address of current QMS user", tx);
      }

      if (darQmsAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(DAR_QMS_AUTH_CONFIG_KEY, darQmsAuthUserId, "Auth Center stable key of DAR QMS user", tx);
      } else {
        await this.configRepo.deleteByKey(DAR_QMS_AUTH_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(DAR_QMS_EMAIL_CONFIG_KEY, tx);
      }
      if (moduleEmails?.darQmsEmail) {
        await this.configRepo.upsertConfigWithDescription(DAR_QMS_EMAIL_CONFIG_KEY, moduleEmails.darQmsEmail, "Email address of DAR QMS user", tx);
      }

      if (carQmsAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(CAR_QMS_AUTH_CONFIG_KEY, carQmsAuthUserId, "Auth Center stable key of CAR QMS user", tx);
      } else {
        await this.configRepo.deleteByKey(CAR_QMS_AUTH_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(CAR_QMS_EMAIL_CONFIG_KEY, tx);
      }
      if (moduleEmails?.carQmsEmail) {
        await this.configRepo.upsertConfigWithDescription(CAR_QMS_EMAIL_CONFIG_KEY, moduleEmails.carQmsEmail, "Email address of CAR QMS user", tx);
      }

      if (darMrAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(DAR_MR_CONFIG_KEY, darMrAuthUserId, "Auth Center stable key of DAR MR user", tx);
      } else {
        await this.configRepo.deleteByKey(DAR_MR_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(DAR_MR_EMAIL_CONFIG_KEY, tx);
      }
      if (moduleEmails?.darMrEmail) {
        await this.configRepo.upsertConfigWithDescription(DAR_MR_EMAIL_CONFIG_KEY, moduleEmails.darMrEmail, "Email address of DAR MR user", tx);
      }

      if (carMrAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(CAR_MR_CONFIG_KEY, carMrAuthUserId, "Auth Center stable key of CAR MR user", tx);
      } else {
        await this.configRepo.deleteByKey(CAR_MR_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(CAR_MR_EMAIL_CONFIG_KEY, tx);
      }
      if (moduleEmails?.carMrEmail) {
        await this.configRepo.upsertConfigWithDescription(CAR_MR_EMAIL_CONFIG_KEY, moduleEmails.carMrEmail, "Email address of CAR MR user", tx);
      }
    });
  }
}
