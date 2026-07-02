import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { db } from "@/lib/db";

export interface FooterConfig {
  moduleKey: string;
  prefix: string;
  label: string;
}

export class QmsConfigService {
  private configRepo = new SystemConfigRepository();

  private getKeys(moduleKey: string) {
    const key = moduleKey.toUpperCase();
    return {
      prefixKey: `${key}_FOOTER_PREFIX`,
      labelKey: `${key}_FOOTER_LABEL`,
    };
  }

  async getFooterConfigs(modules: string[]): Promise<FooterConfig[]> {
    const results = await Promise.all(
      modules.map(async (mod) => {
        const { prefixKey, labelKey } = this.getKeys(mod);
        const [prefix, label] = await Promise.all([
          this.configRepo.findValueByKey(prefixKey),
          this.configRepo.findValueByKey(labelKey),
        ]);
        return {
          moduleKey: mod,
          prefix: prefix ?? "",
          label: label ?? "",
        };
      })
    );
    return results;
  }

  async getSingleFooterConfig(moduleKey: string): Promise<FooterConfig> {
    const { prefixKey, labelKey } = this.getKeys(moduleKey);
    const [prefix, label] = await Promise.all([
      this.configRepo.findValueByKey(prefixKey),
      this.configRepo.findValueByKey(labelKey),
    ]);
    return {
      moduleKey,
      prefix: prefix ?? "",
      label: label ?? "",
    };
  }

  async updateFooterConfigs(configs: FooterConfig[]) {
    await db.$transaction(async (tx) => {
      for (const config of configs) {
        const { prefixKey, labelKey } = this.getKeys(config.moduleKey);
        await this.configRepo.upsertConfigWithDescription(
          prefixKey,
          config.prefix || "",
          `Footer prefix for ${config.moduleKey}`,
          tx
        );
        await this.configRepo.upsertConfigWithDescription(
          labelKey,
          config.label || "",
          `Footer label for ${config.moduleKey}`,
          tx
        );
      }
    });
  }
}
