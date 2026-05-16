"use client";

import { useState, useRef, useCallback } from "react";

type SpFile = {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
};

type PreviewState =
  | { type: "none" }
  | { type: "loading" }
  | { type: "image"; proxyUrl: string; name: string }
  | { type: "pdf"; blobUrl: string; name: string }
  | { type: "office"; embedUrl: string; webUrl: string; name: string }
  | { type: "download"; downloadUrl: string; webUrl: string; name: string; mimeType: string }
  | { type: "error"; message: string };

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

const fileIcon = (item: SpFile) => {
  if (item.folder) return "📁";
  const mime = item.file?.mimeType ?? "";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "📽️";
  return "📎";
};

export default function SharePointPage() {
  const [folderName, setFolderName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [uploadFolderPath, setUploadFolderPath] = useState("");
  const [listPath, setListPath] = useState("");
  const [files, setFiles] = useState<SpFile[]>([]);
  const [preview, setPreview] = useState<PreviewState>({ type: "none" });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listing, setListing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SpFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/sharepoint/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName: folderName.trim(),
          parentPath: folderPath.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(typeof json.error === "string" ? json.error : "Failed to create folder");
      showToast("success", `Folder "${folderName}" created successfully`);
      setFolderName("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (uploadFolderPath.trim()) form.append("folderPath", uploadFolderPath.trim());

      const res = await fetch("/api/sharepoint/upload-file", { method: "POST", body: form });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast("success", `"${file.name}" uploaded successfully`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleListFiles = useCallback(async () => {
    setListing(true);
    setFiles([]);
    setPreview({ type: "none" });
    try {
      const params = new URLSearchParams();
      if (listPath.trim()) params.set("folderPath", listPath.trim());
      const res = await fetch(`/api/sharepoint/list-files?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFiles(json.data ?? []);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "List failed");
    } finally {
      setListing(false);
    }
  }, [listPath]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sharepoint/delete-item?itemId=${confirmDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast("success", `"${confirmDelete.name}" deleted`);
      setFiles((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const OFFICE_MIMES = new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ]);

  const handlePreview = async (item: SpFile) => {
    if (item.folder) {
      setListPath(listPath.trim() ? `${listPath.trim()}/${item.name}` : item.name);
      return;
    }
    setPreview({ type: "loading" });
    try {
      const res = await fetch(`/api/sharepoint/get-file?itemId=${item.id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const { downloadUrl, webUrl, mimeType, name, officeEmbedUrl } = json.data as {
        downloadUrl: string;
        webUrl: string;
        mimeType: string;
        name: string;
        officeEmbedUrl: string | null;
      };

      if (mimeType.startsWith("image/")) {
        setPreview({ type: "image", proxyUrl: `/api/sharepoint/preview-proxy?itemId=${item.id}`, name });
      } else if (mimeType === "application/pdf") {
        const proxyRes = await fetch(`/api/sharepoint/preview-proxy?itemId=${item.id}`);
        if (!proxyRes.ok) throw new Error(`Proxy error: ${proxyRes.status}`);
        const arrayBuffer = await proxyRes.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        setPreview({ type: "pdf", blobUrl, name });
      } else if (OFFICE_MIMES.has(mimeType) && officeEmbedUrl) {
        setPreview({ type: "office", embedUrl: officeEmbedUrl, webUrl, name });
      } else {
        setPreview({ type: "download", downloadUrl, webUrl, name, mimeType });
      }
    } catch (err) {
      setPreview({ type: "error", message: err instanceof Error ? err.message : "Preview failed" });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? "✓ " : "✕ "}
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">SharePoint File Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Create folders, upload files, and preview documents via Microsoft Graph API</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Folder */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-base font-medium text-slate-900 mb-3">Create Folder</h2>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Folder name</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Documents"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Parent path <span className="text-slate-400 font-normal">(optional, e.g. Documents/Reports)</span>
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="Leave empty for root"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2 px-4 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating…" : "Create Folder"}
              </button>
            </form>
          </div>

          {/* Upload File */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-base font-medium text-slate-900 mb-3">Upload File</h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select file</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Destination folder <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={uploadFolderPath}
                  onChange={(e) => setUploadFolderPath(e.target.value)}
                  placeholder="Leave empty for root"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2 px-4 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Uploading…" : "Upload File"}
              </button>
            </form>
          </div>
        </div>

        {/* File Browser */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-base font-medium text-slate-900 shrink-0">Browse Files</h2>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={listPath}
                onChange={(e) => setListPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleListFiles()}
                placeholder="Folder path (empty = root)"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                onClick={handleListFiles}
                disabled={listing}
                className="py-2 px-4 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {listing ? "Loading…" : "Browse"}
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          {listPath && (
            <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
              <button
                onClick={() => { setListPath(""); }}
                className="hover:text-slate-900 transition-colors"
              >
                root
              </button>
              {listPath.split("/").map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span>/</span>
                  <button
                    onClick={() => setListPath(arr.slice(0, i + 1).join("/"))}
                    className="hover:text-slate-900 transition-colors"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* File Table — Desktop */}
          {files.length > 0 && (
            <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium text-slate-600">Name</th>
                    <th className="py-3 px-4 text-left font-medium text-slate-600">Size</th>
                    <th className="py-3 px-4 text-left font-medium text-slate-600">Modified</th>
                    <th className="py-3 px-4 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handlePreview(item)}
                          className="flex items-center gap-2 text-left hover:text-slate-600 transition-colors"
                        >
                          <span>{fileIcon(item)}</span>
                          <span className="font-medium text-slate-900">{item.name}</span>
                          {item.folder && (
                            <span className="text-xs text-slate-400">({item.folder.childCount} items)</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.folder ? "—" : formatSize(item.size)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(item.lastModifiedDateTime)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(item)}
                            className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-medium"
                          >
                            {item.folder ? "Open" : "Preview"}
                          </button>
                          {!item.folder && (
                            <a
                              href={item.webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-medium"
                            >
                              Open
                            </a>
                          )}
                          <button
                            onClick={() => setConfirmDelete(item)}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* File Cards — Mobile */}
          {files.length > 0 && (
            <div className="md:hidden space-y-3">
              {files.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{fileIcon(item)}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.folder ? `${item.folder.childCount} items` : formatSize(item.size)} · {formatDate(item.lastModifiedDateTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handlePreview(item)}
                        className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-medium"
                      >
                        {item.folder ? "Open" : "Preview"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item)}
                        className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && !listing && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <p className="text-3xl mb-2">📂</p>
              <p>Click Browse to list files</p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {preview.type !== "none" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-medium text-slate-900">
                {"name" in preview ? `Preview: ${preview.name}` : "Preview"}
              </h2>
              <button
                onClick={() => {
                  if (preview.type === "pdf") URL.revokeObjectURL(preview.blobUrl);
                  setPreview({ type: "none" });
                }}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
              >
                ✕ Close
              </button>
            </div>

            {preview.type === "loading" && (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading preview…
              </div>
            )}

            {preview.type === "error" && (
              <div className="text-center py-12 text-red-600 text-sm">
                <p className="text-3xl mb-2">⚠️</p>
                <p>{preview.message}</p>
              </div>
            )}

            {/* Image */}
            {preview.type === "image" && (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={preview.proxyUrl}
                  src={preview.proxyUrl}
                  alt={preview.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-200"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <a href={preview.proxyUrl} download={preview.name} className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2">
                  Download
                </a>
              </div>
            )}

            {/* PDF */}
            {preview.type === "pdf" && (
              <div className="flex flex-col gap-2">
                <object
                  key={preview.blobUrl}
                  data={preview.blobUrl}
                  type="application/pdf"
                  className="w-full h-[75vh] rounded-lg border border-slate-200"
                >
                  <p className="text-center py-8 text-slate-500 text-sm">
                    Your browser cannot display PDFs inline.{" "}
                    <a href={preview.blobUrl} download={preview.name} className="underline">
                      Download instead
                    </a>
                  </p>
                </object>
                <div className="flex justify-end">
                  <a href={preview.blobUrl} download={preview.name} className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2">
                    Download PDF
                  </a>
                </div>
              </div>
            )}

            {/* Word / Excel / PowerPoint via Office Online */}
            {preview.type === "office" && (
              <div className="flex flex-col gap-2">
                <iframe
                  src={preview.embedUrl}
                  title={preview.name}
                  className="w-full h-[75vh] rounded-lg border border-slate-200"
                  allowFullScreen
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Powered by Microsoft Office Online</p>
                  <a
                    href={preview.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
                  >
                    Open in SharePoint
                  </a>
                </div>
              </div>
            )}

            {/* Other / download only */}
            {preview.type === "download" && (
              <div className="text-center py-12 text-slate-500 text-sm">
                <p className="text-4xl mb-3">📎</p>
                <p className="font-medium text-slate-700 mb-1">{preview.name}</p>
                <p className="text-slate-400 mb-5">This file type cannot be previewed in the browser.</p>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={preview.downloadUrl}
                    download={preview.name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    ⬇ Download
                  </a>
                  <a
                    href={preview.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Open in SharePoint
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete {confirmDelete.folder ? "Folder" : "File"}</h3>
            <p className="text-sm text-slate-500 mb-1">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700">&ldquo;{confirmDelete.name}&rdquo;</span>?
            </p>
            {confirmDelete.folder && (
              <p className="text-xs text-red-500 mb-4">This will permanently delete the folder and all its contents.</p>
            )}
            {!confirmDelete.folder && (
              <p className="text-xs text-slate-400 mb-4">This action cannot be undone.</p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
