"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import RichTextView from "@/components/shared/RichTextView";
import { ActionPillButton } from "@/components/common/ActionButtons";
import { Button } from "@/components/ui/button";
import { Send, ClipboardCheck, BellRing, FileText, Download, Eye, CheckCircle2, ShieldCheck, ChevronRight, Printer, Paperclip } from "lucide-react";
import CarStatusBadge from "./CarStatusBadge";
import CarTimeline from "./CarTimeline";
import CarIssueDialog from "./CarIssueDialog";
import CarVerifyForm from "./CarVerifyForm";
import CarRespondForm from "./CarRespondForm";
import CarAttachmentUpload from "./CarAttachmentUpload";
import CarFormModal from "./CarFormModal";
import CarMrResponseReviewPanel from "./CarMrResponseReviewPanel";
import CarMrSignDialog from "./CarMrSignDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CarDetail, CarAttachmentRow } from "@/types/car";
import { CAR_SOURCE_LABELS } from "@/types/car";
import { FilePreviewModal } from "@/components/common/FilePreviewModal";
import { fmtDate } from "@/lib/format";
import { parseComment } from "@/lib/utils";

interface Props {
  car: CarDetail;
  userRole: string;
  userId: string;
  userDepartmentId: string | null;
  isPrivileged: boolean;
  userJobTitle?: string | null;
  listPath?: string;
}

async function fetchCar(id: string): Promise<CarDetail> {
  const res = await fetch(`/api/car/${id}`);
  if (!res.ok) throw new Error("Failed to fetch CAR");
  const json = await res.json();
  return json.data;
}

async function createReCar(carId: string): Promise<{ newCarId: string; newCarNo: string }> {
  const res = await fetch(`/api/car/${carId}/re-car`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to create Re-CAR");
  }
  const json = await res.json();
  return json.data;
}

async function setVerify2DueDate(carId: string, nextDueDate: string): Promise<void> {
  const res = await fetch(`/api/car/${carId}/verify2-due-date`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nextDueDate }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to save verification round 2 date");
  }
}

function MrRejectReviewCard({ review }: { review: NonNullable<CarDetail["mrResponseReview"]> }) {
  if (review.action !== "REJECTED" || !review.comment) return null;
  const parsed = parseComment(review.comment);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <h2 className="text-base font-semibold text-rose-800">MR Reject Detail</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-rose-900">{parsed.text || "-"}</p>
      {parsed.attachments?.length ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-rose-700">Attachments</p>
          {parsed.attachments.map((file, index) => (
            <a
              key={`${file.spItemId}-${index}`}
              href={`/api/sharepoint/get-file?itemId=${file.spItemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CarDetailClient({
  car: initialCar,
  userRole,
  userId: _userId,
  userDepartmentId,
  isPrivileged: _isPrivileged,
  userJobTitle,
  listPath = "/car",
}: Props) {
  const t = useT();
  const qc = useQueryClient();
  const router = useRouter();
  void _userId;
  void _isPrivileged;
  const [showRespond, setShowRespond] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMrReview, setShowMrReview] = useState(false);
  const [showMrClose, setShowMrClose] = useState(false);
  const [previewFile, setPreviewFile] = useState<CarAttachmentRow | null>(null);
  const [verify2DueDate, setVerify2DueDateValue] = useState("");

  const { data: car = initialCar } = useQuery({
    queryKey: ["car", initialCar.id],
    queryFn: () => fetchCar(initialCar.id),
    initialData: initialCar,
  });

  const reminderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/car/${car.id}/remind`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Failed to send reminder");
      }
    },
    onSuccess: () => toast.success("ส่ง reminder แล้ว"),
    onError: (err) => toast.error((err as Error).message),
  });

  const reCarMutation = useMutation({
    mutationFn: () => createReCar(car.id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["car", car.id] });
      router.push(`${listPath}/${result.newCarId}`);
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  const verify2DueDateMutation = useMutation({
    mutationFn: () => setVerify2DueDate(car.id, verify2DueDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["car", car.id] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      setVerify2DueDateValue("");
      toast.success("Saved verification round 2 date");
    },
    onError: (err) => toast.error((err as Error).message, { duration: Infinity }),
  });

  const verify1 = car.verifications.find((v) => v.round === 1);

  const canRespond =
    car.status === "ISSUED" &&
    userDepartmentId === car.targetDepartment.id;

  const canSetVerify2DueDate =
    car.status === "VERIFY_2" &&
    verify1?.result === "FAILED" &&
    !verify1.nextDueDate &&
    (!!userDepartmentId &&
      (userDepartmentId === car.targetDepartment.id ||
        userDepartmentId === car.targetAuthDepartmentId));

  const canVerify =
    (car.status === "VERIFY_1" || car.status === "VERIFY_2") &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canIssue =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canEdit =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canReCar =
    car.status === "RE_CAR" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canRemind =
    car.status === "ISSUED" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canMrReview =
    car.status === "RESPONDED" &&
    userRole === "MR";

  const canMrClose =
    car.status === "CLOSED" &&
    !car.mrSignature &&
    userRole === "MR";

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href={listPath} className="hover:text-slate-600 transition-colors">CAR</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono font-medium text-slate-600">{car.carNo}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{car.carNo}</h1>
            <CarStatusBadge status={car.status} />
            {car.reCar && (
              <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 font-semibold">
                {t("car.detail.reCarBadge")}
              </span>
            )}
          </div>
          {car.reCarRef && (
            <p className="mt-1 text-sm text-slate-500">
              {t("car.detail.refLabel")}{" "}
              <Link href={`/qms/car/${car.reCarRef.id}`} className="text-blue-600 hover:underline font-mono">
                {car.reCarRef.carNo}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <ActionPillButton
              tone="edit"
              label={t("car.detail.btnEdit")}
              onClick={() => setShowEdit(true)}
            />
          )}
          {canIssue && <CarIssueDialog carId={car.id} carNo={car.carNo} />}
          {canRemind && (
            <Button
              variant="outline"
              onClick={() => reminderMutation.mutate()}
              disabled={reminderMutation.isPending}
            >
              <BellRing className="w-3.5 h-3.5 mr-1.5" />
              {reminderMutation.isPending ? "กำลังส่ง..." : "ส่ง Reminder"}
            </Button>
          )}
          {canVerify && !showVerify && (
            <Button onClick={() => setShowVerify(true)} className="bg-orange-500 hover:bg-orange-600">
              <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
              {t("car.detail.btnVerify")}
            </Button>
          )}
          {canMrReview && (
            <>
              <Button onClick={() => { setShowMrReview(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                อนุมัติ / ส่งคืน
              </Button>
            </>
          )}
          {canMrClose && (
            <Button onClick={() => setShowMrClose(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              ลงนามปิด CAR
            </Button>
          )}
          {canReCar && (
            <Button
              onClick={() => reCarMutation.mutate()}
              disabled={reCarMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {reCarMutation.isPending ? t("car.detail.btnCreatingReCar") : t("car.detail.btnCreateReCar")}
            </Button>
          )}
          <Link href={`/print/qms/car/${car.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              พิมพ์เอกสาร CAR
            </Button>
          </Link>
        </div>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Details card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelType")}</p>
              <p className="text-sm font-medium text-slate-900">{CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}</p>
              {car.sourceDetail && <p className="text-xs text-slate-500 mt-0.5">{car.sourceDetail}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelTargetDept")}</p>
              <p className="text-sm font-medium text-slate-900">{car.targetDepartment.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelIssuer")}</p>
              <p className="text-sm font-medium text-slate-900">{car.issuer.name} ({car.issuerPosition})</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelIso")}</p>
              <p className="text-sm font-medium text-slate-900">{car.isoStandards.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelIssuedAt")}</p>
              <p className="text-sm font-medium">{fmtDate(car.issuedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelDueAt")}</p>
              <p className={`text-sm font-medium ${car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED" ? "text-rose-600" : ""}`}>
                {fmtDate(car.responseDueAt)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">{t("car.detail.labelDefect")}</p>
              <RichTextView content={car.defectDetail} />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">{t("car.detail.labelNonConformance")}</p>
              <RichTextView content={car.nonConformanceRef} />
            </div>
          </div>

          {car.mrResponseReview && <MrRejectReviewCard review={car.mrResponseReview} />}

          {/* Respond prompt (USER) */}
          {canRespond && !showRespond && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-blue-800">{t("car.detail.respondPrompt")}</p>
              <Button onClick={() => setShowRespond(true)} className="shrink-0">
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {t("car.detail.btnRespond")}
              </Button>
            </div>
          )}
          {showRespond && (
            <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">{t("car.detail.respondFormTitle")}</h2>
              <CarRespondForm carId={car.id} defaultPosition={userJobTitle ?? ""} onSuccess={() => setShowRespond(false)} />
            </div>
          )}

          {canSetVerify2DueDate && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-base font-semibold text-amber-900">Set Verification Round 2 Date</h2>
              <p className="mt-1 text-sm text-amber-800">
                QMS recorded Verification 1 as failed. Please set the completion date for the second follow-up.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-amber-900">Completion date</label>
                  <input
                    type="date"
                    value={verify2DueDate}
                    onChange={(event) => setVerify2DueDateValue(event.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:border-[#0F1059] focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => verify2DueDateMutation.mutate()}
                  disabled={!verify2DueDate || verify2DueDateMutation.isPending}
                >
                  {verify2DueDateMutation.isPending ? "Saving..." : "Save Date"}
                </Button>
              </div>
            </div>
          )}

          {/* Verify form (QMS) */}
          {showVerify && (
            <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                {t("car.detail.verifyTitle", { round: String(car.status === "VERIFY_2" ? 2 : 1) })}
              </h2>
              <CarVerifyForm
                carId={car.id}
                currentStatus={car.status}
                defaultPosition={userJobTitle ?? ""}
                onSuccess={() => setShowVerify(false)}
              />
            </div>
          )}

          {/* Response detail */}
          {car.response && (
            <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-800">{t("car.detail.responseTitle")}</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">{t("car.detail.labelResponder")}</dt>
                  <dd className="text-slate-800">{car.response.responder.name} ({car.response.responderPosition})</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t("car.detail.labelRespondedAt")}</dt>
                  <dd className="text-slate-800">{fmtDate(car.response.respondedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t("car.detail.labelPlannedDate")}</dt>
                  <dd className="text-slate-800">{fmtDate(car.response.plannedCompletionDate)}</dd>
                </div>
                {car.response.responseType === "FIVE_WHY" && car.response.fiveWhys && car.response.fiveWhys.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500 mb-2">5 Whys Analysis</dt>
                    <dd className="space-y-2">
                      {car.response.fiveWhys.map((w, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-600 text-xs mb-1">Why {i + 1}: {w.question}</p>
                          <p className="text-slate-800">{w.answer || <span className="text-slate-400">—</span>}</p>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{t("car.detail.labelRootCause")}</dt>
                  <dd className="text-slate-800">{car.response.rootCauseSummary}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{t("car.detail.labelImmediateAction")}</dt>
                  <dd className="text-slate-800 whitespace-pre-wrap">{car.response.immediateAction}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{t("car.detail.labelPreventiveAction")}</dt>
                  <dd className="text-slate-800 whitespace-pre-wrap">{car.response.preventiveAction}</dd>
                </div>
                {car.response.responderSignaturePath && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500 mb-1">ลายเซ็นผู้ตอบกลับ</dt>
                    <dd>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={car.response.responderSignaturePath} alt="ลายเซ็น" className="h-12 object-contain border border-slate-100 rounded-lg p-1 bg-white" />
                    </dd>
                  </div>
                )}
              </dl>

              {/* Attachments */}
              {car.response.attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">ไฟล์แนบ</p>
                  <ul className="space-y-1">
                    {car.response.attachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="flex-1 truncate text-sm text-slate-700">{a.fileName}</span>
                        <span className="shrink-0 text-xs text-slate-400">{Math.round(a.fileSize / 1024)} KB</span>
                        <button
                          onClick={() => setPreviewFile(a)}
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a href={`/api/sharepoint/get-file?itemId=${a.spItemId}`} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                          <Download className="h-4 w-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upload — target dept while ISSUED (responding), or QMS/MR/IT always */}
              {((userDepartmentId === car.targetDepartment.id && car.status === "ISSUED") ||
                userRole === "QMS" ||
                userRole === "MR" ||
                userRole === "IT") &&
                car.status !== "CLOSED" &&
                car.status !== "CANCELLED" && (
                  <div className="pt-2 border-t border-slate-100">
                    <CarAttachmentUpload
                      carResponseId={car.response.id}
                      onUploaded={() => qc.invalidateQueries({ queryKey: ["car", car.id] })}
                    />
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right — timeline (sticky) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">{t("car.detail.timelineTitle")}</h2>
            <CarTimeline car={car} />
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <CarFormModal open={showEdit} onClose={() => setShowEdit(false)} editCar={car} />

      {/* MR — review response modal */}
      <Dialog open={showMrReview} onOpenChange={setShowMrReview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ตรวจสอบแผนแก้ไข — {car.carNo}</DialogTitle>
          </DialogHeader>
          <CarMrResponseReviewPanel
            carId={car.id}
            car={car}
            onSuccess={() => {
              setShowMrReview(false);
              qc.invalidateQueries({ queryKey: ["car", car.id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* MR — sign to close modal */}
      <Dialog open={showMrClose} onOpenChange={setShowMrClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ลงนามปิด CAR — {car.carNo}</DialogTitle>
          </DialogHeader>
          <CarMrSignDialog
            carId={car.id}
            car={car}
            onSuccess={() => {
              setShowMrClose(false);
              qc.invalidateQueries({ queryKey: ["car", car.id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Attachment preview */}
      {previewFile && (
        <FilePreviewModal
          target={{
            fileName: previewFile.fileName,
            mimeType: previewFile.mimeType,
            sharePointItemId: previewFile.spItemId,
            spDownloadUrl: previewFile.spDownloadUrl,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
