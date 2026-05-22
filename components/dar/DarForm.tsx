"use client";

import { useDarForm } from "@/hooks/use-dar-form";
import { useToast } from "@/hooks/use-toast";
import Toast from "@/components/common/Toast";
import DarRequesterSection from "./DarRequesterSection";
import DarObjectiveSection from "./DarObjectiveSection";
import DarItemsSection from "./DarItemsSection";
import DarDistributionSection from "./DarDistributionSection";
import DarFormActions from "./DarFormActions";
import DarAttachmentUpload from "./DarAttachmentUpload";
import type { DarDetail, DarObjective, DarDocType, TempAttachmentInput } from "@/types/dar";
import { useT } from "@/lib/i18n";

type Props = {
  mode: "create" | "edit";
  initialData?: DarDetail;
  departments: { id: string; name: string }[];
  requesterInfo: {
    name: string | null;
    employeeId: string | null;
    department: string | null;
    requestDate: string;
  };
  // Stable UUID for the temp folder — generated server-side and passed in
  tempId: string;
};

export default function DarForm({ mode, initialData, departments, requesterInfo, tempId }: Props) {
  const t = useT();
  const { toast, showToast, hideToast } = useToast();

  const {
    state, errors, isSaving, isSubmitting,
    savedDarId, setTempAttachments,
    setField, saveDraft, submitForm,
  } = useDarForm(
    mode,
    initialData,
    (msg) => showToast("success", msg),
    (msg) => showToast("error", msg),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DarRequesterSection
          name={requesterInfo.name}
          employeeId={requesterInfo.employeeId}
          department={requesterInfo.department}
          requestDate={requesterInfo.requestDate}
        />

        <DarObjectiveSection
          objective={state.objective}
          docType={state.docType}
          docTypeOther={state.docTypeOther}
          onObjectiveChange={(v: DarObjective) => setField("objective", v)}
          onDocTypeChange={(v: DarDocType) => setField("docType", v)}
          onDocTypeOtherChange={(v) => setField("docTypeOther", v)}
          errors={{ objective: errors.objective, docType: errors.docType, docTypeOther: errors.docTypeOther }}
        />
      </div>

      <div className="card-premium p-5">
        <h2 className="text-sm md:text-base font-bold text-primary mb-3">
          {t("sectionReason")} <span className="text-error">*</span>
        </h2>
        <textarea
          className={`textarea textarea-bordered w-full text-[14px] min-h-25 ${errors.reason ? "textarea-error" : ""}`}
          placeholder={t("phReasonForRequest")}
          value={state.reason}
          onChange={(e) => setField("reason", e.target.value)}
          maxLength={2000}
        />
        {errors.reason && <p className="text-[12px] text-error mt-1">{errors.reason}</p>}
      </div>

      <DarItemsSection
        items={state.items}
        onChange={(items) => setField("items", items)}
        errors={errors}
      />

      <DarDistributionSection
        departments={departments}
        selected={state.distributionDepartmentIds}
        onChange={(ids) => setField("distributionDepartmentIds", ids)}
      />

      {/* Attachment section */}
      <div className="card-premium p-5">
        <h2 className="text-sm md:text-base font-bold text-primary mb-3">{t("sectionAttach")}</h2>
        <p className="text-[13px] text-neutral mb-3">{t("attachDesc")}</p>

        {/* Edit mode: DAR already exists — use saved mode */}
        {mode === "edit" && savedDarId ? (
          <DarAttachmentUpload
            mode="saved"
            darId={savedDarId}
            initialAttachments={initialData?.attachments ?? []}
            canEdit
          />
        ) : (
          /* Create mode: upload to temp folder immediately */
          <DarAttachmentUpload
            mode="temp"
            tempId={tempId}
            onTempItemsChange={(items: TempAttachmentInput[]) => setTempAttachments(items)}
          />
        )}
      </div>

      <DarFormActions
        mode={mode}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        onSaveDraft={saveDraft}
        onSubmit={submitForm}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={hideToast} />}
    </div>
  );
}
