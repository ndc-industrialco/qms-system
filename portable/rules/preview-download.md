# Portable Preview / Download Rules

## Goals

- Deliver files safely without exposing unauthorized upstream URLs.
- Keep preview and download behavior predictable across document domains.
- Separate inline preview behavior from forced-download behavior.

## Architecture Rules

- File preview and download must go through server routes, not direct client access to private storage URLs.
- Route handlers must authenticate the user before resolving file metadata.
- Permission checks for file access must be delegated to the relevant service layer.
- Services should return file metadata only after record-level access is verified.

## Preview Rules

- Preview routes should be used for browser-inline rendering.
- Preview endpoints must validate required identifiers such as `itemId`, `attachmentId`, or `revisionId`.
- Preview routes should fetch the upstream file server-side and stream or relay it back to the browser.
- Preferred response headers for preview:
  - `Content-Type`: resolved MIME type or upstream fallback
  - `Content-Disposition: inline`
  - `Content-Length` when known
  - `Cache-Control: private, max-age=300` or another short private cache window
- Preview routes should return `502` or equivalent upstream failure responses when file storage fetch fails.

## Download Rules

- Download routes should redirect only when the upstream URL is already scoped and access-checked, or should proxy the file if headers must be controlled.
- Download logic should always resolve the latest valid downloadable artifact on the server.
- "Latest revision" logic must be explicit:
  - prefer `ACTIVE` revision
  - otherwise fall back according to domain rules
- If no downloadable file exists, return a domain error such as `NotFoundError`.

## Permission Rules

- Preview and download both require the same or stricter record-level authorization as viewing the parent record.
- File routes must not trust client-provided filenames, MIME types, or download URLs.
- Services must derive the real upstream URL from trusted persisted metadata.

## Integration Rules

- Upstream storage adapters should normalize:
  - `downloadUrl`
  - `webUrl`
  - `mimeType`
  - `name`
- Preview logic should prefer trusted persisted `downloadUrl` values from upstream APIs when available.
- Storage integration failures must not leak raw upstream internals to end users.

## UX Rules

- Use preview when the file type is browser-renderable and the task is inspection-first.
- Use direct download when the file is binary, office-native, or likely to be saved externally.
- Preview actions should be labeled explicitly as `Preview`, not `Open`, when the behavior is inline.
- Download actions should be labeled explicitly as `Download latest`, `Download attachment`, or another artifact-specific label.

## Operational Rules

- Log preview/download failures with request ID and resource identifiers.
- Keep preview endpoints lightweight; expensive transformations should be asynchronous or cached.
- Large-file strategies should be documented separately if the system supports files too large for simple proxying.
