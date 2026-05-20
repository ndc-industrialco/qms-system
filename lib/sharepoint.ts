/**
 * Microsoft Graph API — SharePoint helpers (Edge-Runtime compatible)
 *
 * Uses raw fetch — no Node.js built-ins, no SDK dependencies.
 * Required Azure AD app permissions:
 *   - Sites.ReadWrite.All
 *
 * Environment variables:
 *   AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
 *   SHAREPOINT_SITE_ID
 */

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_AD_TENANT_ID!;
  const clientId = process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to acquire access token: ${res.status} ${errorText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

const SITE_ID = () => process.env.SHAREPOINT_SITE_ID!;

export type SpFile = {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  parentReference?: { path: string };
};

export async function createFolder(folderName: string, parentPath = "root"): Promise<SpFile> {
  const token = await getAccessToken();
  const siteId = SITE_ID();

  const endpoint = parentPath === "root"
    ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(parentPath)}:/children`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph createFolder ${res.status}: ${text}`);
  }

  return res.json() as Promise<SpFile>;
}

export async function uploadFile(
  fileName: string,
  fileBuffer: Uint8Array,
  folderPath = "root"
): Promise<SpFile> {
  const token = await getAccessToken();
  const siteId = SITE_ID();

  const endpoint = folderPath === "root"
    ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(fileName)}:/content`
    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}:/content`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: fileBuffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph uploadFile ${res.status}: ${text}`);
  }

  return res.json() as Promise<SpFile>;
}

export async function listFiles(folderPath = "root"): Promise<SpFile[]> {
  const token = await getAccessToken();
  const siteId = SITE_ID();

  const endpoint = folderPath === "root"
    ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURIComponent(folderPath)}:/children`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph listFiles ${res.status}: ${text}`);
  }

  const data = await res.json() as { value: SpFile[] };
  return data.value ?? [];
}

export type FileInfo = {
  downloadUrl: string;
  webUrl: string;
  name: string;
  mimeType: string;
};

// @microsoft.graph.downloadUrl is an OData annotation — Graph omits it when
// $select is present (even if listed). Fetch without $select to get all fields.
export async function getFileInfo(itemId: string): Promise<FileInfo> {
  const token = await getAccessToken();
  const siteId = SITE_ID();
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error ${res.status}: ${text}`);
  }

  const item = await res.json() as {
    "@microsoft.graph.downloadUrl"?: string;
    webUrl: string;
    name: string;
    file?: { mimeType: string };
  };

  return {
    downloadUrl: item["@microsoft.graph.downloadUrl"] ?? "",
    webUrl: item.webUrl,
    name: item.name,
    mimeType: item.file?.mimeType ?? "",
  };
}

export async function getFileStream(
  itemId: string
): Promise<{ stream: ReadableStream; contentType: string; name: string }> {
  const info = await getFileInfo(itemId);
  if (!info.downloadUrl) throw new Error("No download URL returned from Graph API");
  const res = await fetch(info.downloadUrl);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  if (!res.body) throw new Error("Response body is null");
  return {
    stream: res.body,
    contentType: res.headers.get("content-type") ?? info.mimeType,
    name: info.name,
  };
}

export async function deleteItem(itemId: string): Promise<void> {
  const token = await getAccessToken();
  const siteId = SITE_ID();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  // 204 = success, 404 = already gone — both are acceptable
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Graph deleteItem ${res.status}: ${text}`);
  }
}

// Returns a short-lived embed URL for Office files via the Graph /preview endpoint.
export async function getOfficePreviewUrl(itemId: string): Promise<string> {
  const token = await getAccessToken();
  const siteId = SITE_ID();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/preview`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph preview ${res.status}: ${text}`);
  }

  const data = await res.json() as { getUrl: string };
  return data.getUrl;
}
