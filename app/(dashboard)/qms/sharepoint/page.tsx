"use client";


export const runtime = 'nodejs';
import { useCallback, useEffect, useRef, useState } from "react";
import type { SpFile } from "@/lib/sharepoint";
import { useT } from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

type PreviewState =
  | { kind: "none" }
  | { kind: "loading"; file: SpFile }
  | { kind: "image"; file: SpFile; proxyUrl: string }
  | { kind: "pdf"; file: SpFile; blobUrl: string }
  | { kind: "office"; file: SpFile; embedUrl: string }
  | { kind: "download"; file: SpFile }
  | { kind: "error"; file: SpFile; message: string };

const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

function mimeOf(file: SpFile): string {
  return file.file?.mimeType ?? "";
}

function isImage(mime: string) { return mime.startsWith("image/"); }
function isPdf(mime: string) { return mime === "application/pdf"; }
function isOffice(mime: string) { return OFFICE_MIMES.has(mime); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function FileTypeBadge({ mime }: { mime: string }) {
  if (isPdf(mime)) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-red-100 text-red-600">PDF</span>;
  if (isImage(mime)) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-emerald-100 text-emerald-600">IMG</span>;
  if (mime.includes("word")) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-blue-100 text-blue-600">DOC</span>;
  if (mime.includes("excel") || mime.includes("spreadsheet")) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-emerald-100 text-emerald-600">XLS</span>;
  if (mime.includes("powerpoint") || mime.includes("presentation")) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-amber-100 text-amber-700">PPT</span>;
  if (!mime) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-slate-100 text-slate-500">DIR</span>;
  return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-slate-100 text-slate-500">FILE</span>;
}

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-warning shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function FileDocIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const segments = path ? path.split("/").filter(Boolean) : [];

  return (
    <nav className="flex items-center gap-1 text-[13px] flex-wrap">
      <button
        type="button"
        className="text-primary hover:underline font-medium"
        onClick={() => onNavigate("")}
      >
        Root
      </button>
      {segments.map((seg, i) => {
        const segPath = segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={segPath} className="flex items-center gap-1">
            <span className="text-neutral">/</span>
            {isLast ? (
              <span className="text-base-content font-medium">{seg}</span>
            ) : (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => onNavigate(segPath)}
              >
                {seg}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({
  file,
  onConfirm,
  onCancel,
  deleting,
  t,
}: {
  file: SpFile;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const isFolder = !!file.folder;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/20 p-4">
      <div className="bg-base-100 rounded-xl shadow-lg border border-base-300 w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm md:text-base font-bold text-primary">
          {t("spConfirmDelete")}
        </h3>
        <p className="text-xs md:text-sm text-neutral">
          {isFolder
            ? <>{t("spDeleteFolder")} <span className="text-base-content font-medium">{file.name}</span> {t("spDeleteSuffix")}</>
            : <>{t("spDeleteFile")} <span className="text-base-content font-medium">{file.name}</span> {t("spDeleteFileSuffix")}</>}
        </p>
        <p className="text-[11px] text-error">{t("irreversible")}</p>
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={deleting}>
            {t("cancel")}
          </button>
          <button type="button" className="btn btn-error btn-sm" onClick={onConfirm} disabled={deleting}>
            {deleting ? <span className="loading loading-spinner loading-xs" /> : t("spDeleteBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  preview,
  onClose,
  t,
}: {
  preview: Exclude<PreviewState, { kind: "none" }>;
  onClose: () => void;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const file = preview.file;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-xl shadow-lg border border-base-300 w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 960, maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-base-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeBadge mime={mimeOf(file)} />
            <span className="text-xs md:text-sm font-semibold text-neutral truncate">{file.name}</span>
            {file.size > 0 && (
              <span className="text-[11px] md:text-xs text-gray-500 shrink-0">{formatBytes(file.size)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-xs gap-1 text-neutral"
              title={t("spOpenSP")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              SharePoint
            </a>
            <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-auto bg-base-200 flex items-center justify-center"
          style={{ minHeight: 420 }}
        >
          {preview.kind === "loading" && (
            <span className="loading loading-spinner loading-lg text-primary" />
          )}

          {preview.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.proxyUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {preview.kind === "pdf" && (
            <object
              data={preview.blobUrl}
              type="application/pdf"
              className="w-full border-0"
              style={{ height: "70vh" }}
            >
              <p className="text-[14px] text-neutral p-8">
                {t("spNoPreview")} —{" "}
                <a href={preview.blobUrl} download={file.name} className="text-primary underline">
                  {t("spPdfFallback")}
                </a>
              </p>
            </object>
          )}

          {preview.kind === "office" && (
            <iframe
              src={preview.embedUrl}
              className="w-full border-0"
              style={{ height: "70vh" }}
              title={file.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}

          {preview.kind === "download" && (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <FileTypeBadge mime={mimeOf(file)} />
              <p className="text-[14px] text-neutral">{t("spNoPreview")}</p>
              <a
                href={file.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                {t("spOpenSP")}
              </a>
            </div>
          )}

          {preview.kind === "error" && (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="text-error text-[14px]">{preview.message}</span>
              <a
                href={file.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                {t("spOpenSP")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SharePointBrowserPage() {
  const t = useT();
  const [listPath, setListPath] = useState<string>("");
  const [files, setFiles] = useState<SpFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ kind: "none" });
  const [confirmDelete, setConfirmDelete] = useState<SpFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Track blob URLs created for PDF previews so we can revoke them on close
  const pdfBlobRef = useRef<string | null>(null);

  const loadFolder = useCallback(async (path: string) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/sharepoint/list-files?folderPath=${encodeURIComponent(path || "root")}`);
      const json = await res.json();
      if (!res.ok || json.error) { setListError(json.error ?? t("spLoadFail")); return; }
      setFiles((json.data as SpFile[]).sort((a, b) => {
        // folders first, then alphabetical
        const aFolder = a.folder ? 0 : 1;
        const bFolder = b.folder ? 0 : 1;
        if (aFolder !== bFolder) return aFolder - bFolder;
        return a.name.localeCompare(b.name, "th");
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFolder(listPath); }, [listPath, loadFolder]);

  function navigateTo(path: string) {
    setListPath(path);
    closePreview();
  }

  function closePreview() {
    if (pdfBlobRef.current) {
      URL.revokeObjectURL(pdfBlobRef.current);
      pdfBlobRef.current = null;
    }
    setPreview({ kind: "none" });
  }

  async function openPreview(file: SpFile) {
    if (file.folder) {
      // navigate into folder
      const newPath = listPath ? `${listPath}/${file.name}` : file.name;
      navigateTo(newPath);
      return;
    }

    const mime = mimeOf(file);
    setPreview({ kind: "loading", file });

    try {
      if (isImage(mime)) {
        // proxy URL — browser fetches through Next.js, no CORS
        const proxyUrl = `/api/sharepoint/preview-proxy?itemId=${encodeURIComponent(file.id)}`;
        setPreview({ kind: "image", file, proxyUrl });
        return;
      }

      if (isPdf(mime)) {
        // fetch through proxy → blob URL for reliable inline rendering
        const res = await fetch(`/api/sharepoint/preview-proxy?itemId=${encodeURIComponent(file.id)}`);
        if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        pdfBlobRef.current = blobUrl;
        setPreview({ kind: "pdf", file, blobUrl });
        return;
      }

      if (isOffice(mime)) {
        // fetch Graph /preview embed URL via get-file endpoint
        const res = await fetch(`/api/sharepoint/get-file?itemId=${encodeURIComponent(file.id)}`);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "ดึง embed URL ล้มเหลว");
        const embedUrl: string = json.data?.officeEmbedUrl;
        if (!embedUrl) throw new Error("ไม่พบ embed URL");
        setPreview({ kind: "office", file, embedUrl });
        return;
      }

      setPreview({ kind: "download", file });
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setPreview({ kind: "error", file, message });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/sharepoint/delete-item?itemId=${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        alert(json.error ?? t("spDeleteFail"));
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasPreview = preview.kind !== "none";

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col gap-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-primary">{t("spTitle")}</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">{t("spSubtitle")}</p>
      </div>

      {/* Toolbar */}
      <div className="card-premium px-5 py-4 border border-base-300 rounded-xl shadow-sm flex items-center gap-3">
        {/* Back button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          disabled={!listPath}
          onClick={() => {
            const parts = listPath.split("/");
            parts.pop();
            navigateTo(parts.join("/"));
          }}
          title={t("spGoBack")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <Breadcrumb path={listPath} onNavigate={navigateTo} />
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => loadFolder(listPath)}
          disabled={loading}
          title={t("spRefresh")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="card-premium overflow-hidden border border-base-300 rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-error text-[14px]">{listError}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => loadFolder(listPath)}>{t("retry")}</button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="text-neutral text-[14px]">{t("spEmpty")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="table w-full">
                <thead>
                  <tr className="bg-base-200 text-xs text-gray-500 border-b border-base-200">
                    <th className="py-3.5 px-4 font-semibold w-12"></th>
                    <th className="py-3.5 px-4 font-semibold">{t("spColName")}</th>
                    <th className="py-3.5 px-4 font-semibold w-24">{t("spColType")}</th>
                    <th className="py-3.5 px-4 font-semibold w-28">{t("spColSize")}</th>
                    <th className="py-3.5 px-4 font-semibold w-36">{t("spColModified")}</th>
                    <th className="py-3.5 px-4 font-semibold w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const mime = mimeOf(file);
                    const isDir = !!file.folder;
                    return (
                      <tr key={file.id} className="border-b border-base-200 hover:bg-base-200 transition-colors duration-100">
                        <td className="py-3.5 px-4">
                          {isDir ? <FolderIcon /> : <FileDocIcon />}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            className="text-xs md:text-sm text-neutral hover:text-primary font-semibold text-left truncate max-w-xs block"
                            onClick={() => openPreview(file)}
                          >
                            {file.name}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          {isDir
                            ? <span className="text-[11px] md:text-xs text-gray-500">{file.folder?.childCount ?? 0} {t("spItems")}</span>
                            : <FileTypeBadge mime={mime} />}
                        </td>
                        <td className="py-3 px-4 text-[11px] md:text-xs text-gray-500">
                          {isDir ? "—" : formatBytes(file.size)}
                        </td>
                        <td className="py-3 px-4 text-[11px] md:text-xs text-gray-500">
                          {formatDate(file.lastModifiedDateTime)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            {!isDir && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-neutral"
                                onClick={() => openPreview(file)}
                                title={t("spPreview")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            )}
                            <a
                              href={file.webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs text-neutral"
                              title={t("spOpenSP")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => setConfirmDelete(file)}
                              title={t("spDeleteBtn")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col divide-y divide-base-200 md:hidden">
              {files.map((file) => {
                const mime = mimeOf(file);
                const isDir = !!file.folder;
                return (
                  <div key={file.id} className="flex items-center gap-2 p-4">
                    {isDir ? <FolderIcon /> : <FileDocIcon />}
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        className="text-xs md:text-sm font-semibold text-neutral hover:text-primary text-left truncate w-full block"
                        onClick={() => openPreview(file)}
                      >
                        {file.name}
                      </button>
                      <p className="text-[11px] md:text-xs text-gray-500">
                        {isDir
                          ? `${file.folder?.childCount ?? 0} ${t("spItems")}`
                          : `${formatBytes(file.size)} · ${formatDate(file.lastModifiedDateTime)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isDir && <FileTypeBadge mime={mime} />}
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => setConfirmDelete(file)}
                        title={t("spDeleteBtn")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Preview modal */}
      {hasPreview && (
        <PreviewModal
          preview={preview as Exclude<PreviewState, { kind: "none" }>}
          onClose={closePreview}
          t={t}
        />
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <DeleteModal
          file={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          deleting={deleting}
          t={t}
        />
      )}
    </div>
  );
}
