/* Kelak Kembali — Google Drive sync for moodboard assets.
 *
 * Mirrors the google-calendar function's auth pattern: the refresh token lives
 * in google_credentials (service-role only), and a fresh access token is minted
 * per invocation. The scope needed is drive.file, which lets this app manage
 * only files it created — nothing else in the user's Drive is touched.
 *
 * Three actions:
 *
 *   upload_draft_images  { customer_name, order_id, images[] }
 *     -> creates a temp folder, uploads images, returns their web view URLs
 *
 *   save_moodboard_pdf   { customer_name, order_id, doc_name, pdf_base64 }
 *     -> writes compiled PDF to the archive folder, returns shareable link
 *
 *   cleanup_draft        { folder_id }
 *     -> deletes the temp draft folder and its contents
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API        = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

const ARCHIVE_FOLDER_NAME = 'Kelak Kembali Moodboards';
const DRAFT_ROOT_NAME     = 'Moodboard Drafts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

class Told extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

/* ------------------------------- Google auth ------------------------------ */

async function readCredential() {
  const db = serviceClient();
  const { data, error } = await db
    .from('google_credentials')
    .select('refresh_token')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Told('Could not read the credential: ' + error.message, 500);
  return data;
}

async function accessToken(refreshToken: string) {
  const id     = Deno.env.get('GOOGLE_CLIENT_ID');
  const secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!id || !secret) {
    throw new Told('Google is not configured on the server.', 500);
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const body = await res.json();
  if (!res.ok) {
    if (body.error === 'invalid_grant') {
      throw new Told('Google access was revoked. Reconnect from the Google Calendar page.', 401);
    }
    throw new Told('Google refused the stored credential: ' + (body.error_description || body.error), 401);
  }
  return body.access_token as string;
}

/* ----------------------------- Drive helpers ------------------------------ */

async function driveRequest(
  token: string, path: string, method: string, body?: unknown, query?: Record<string, string>
) {
  const url = new URL(`${DRIVE_API}${path}`);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (res.status === 204) return null;
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Told(
      'Google Drive: ' + (out.error?.message || res.statusText || res.status),
      res.status === 401 || res.status === 403 ? 401 : 502
    );
  }
  return out;
}

async function findOrCreateFolder(token: string, name: string, parentId?: string) {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false` +
    (parentId ? ` and '${parentId}' in parents` : '');

  const existing = await driveRequest(token, '/files', 'GET', undefined, {
    q, fields: 'files(id,name)', pageSize: '1'
  });
  if (existing?.files?.length) return existing.files[0].id as string;

  const meta: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) meta.parents = [parentId];
  const created = await driveRequest(token, '/files', 'POST', meta, { fields: 'id' });
  return created.id as string;
}

async function uploadFile(
  token: string, folderId: string, fileName: string, mimeType: string, data: Uint8Array
) {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const boundary = '----KelakKembaliBoundary';

  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const postamble = encoder.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(preamble.length + data.length + postamble.length);
  body.set(preamble, 0);
  body.set(data, preamble.length);
  body.set(postamble, preamble.length + data.length);

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink,webContentLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    }
  );

  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Told('Upload failed: ' + (out.error?.message || res.status), 502);
  }
  return out;
}

async function setViewPermission(token: string, fileId: string) {
  await driveRequest(token, `/files/${fileId}/permissions`, 'POST', {
    role: 'reader',
    type: 'anyone'
  });
}

async function deleteFile(token: string, fileId: string) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok && res.status !== 404) {
    const out = await res.json().catch(() => ({}));
    throw new Told('Delete failed: ' + (out.error?.message || res.status), 502);
  }
}

/* -------------------------------- Actions --------------------------------- */

async function uploadDraftImages(
  token: string,
  customerName: string,
  orderId: string,
  images: Array<{ name: string; mimeType: string; base64: string }>
) {
  const draftsRoot = await findOrCreateFolder(token, DRAFT_ROOT_NAME);
  const folderName = `${customerName}_${orderId}`;
  const folderId = await findOrCreateFolder(token, folderName, draftsRoot);

  const results = [];
  for (const img of images) {
    const raw = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
    const file = await uploadFile(token, folderId, img.name, img.mimeType, raw);
    results.push({
      id: file.id,
      name: img.name,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink
    });
  }

  return { folder_id: folderId, files: results };
}

async function saveMoodboardPdf(
  token: string,
  docName: string,
  pdfBase64: string
) {
  const archiveId = await findOrCreateFolder(token, ARCHIVE_FOLDER_NAME);

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const safeName = docName.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');
  const fileName = safeName
    ? `Moodboard-KelakKembali-${safeName}-${iso}.pdf`
    : `Moodboard-KelakKembali-${iso}.pdf`;

  const raw = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const file = await uploadFile(token, archiveId, fileName, 'application/pdf', raw);

  await setViewPermission(token, file.id);

  return {
    file_id: file.id,
    drive_link: file.webViewLink,
    file_name: fileName
  };
}

async function cleanupDraft(token: string, folderId: string) {
  await deleteFile(token, folderId);
  return { deleted: true };
}

/* -------------------------------- Handler --------------------------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const { action, ...payload } = await req.json();

    const cred = await readCredential();
    if (!cred) throw new Told('Google is not connected. Connect from the Google Calendar page.', 409);
    const token = await accessToken(cred.refresh_token);

    if (action === 'upload_draft_images') {
      const { customer_name, order_id, images } = payload;
      if (!customer_name || !order_id || !images?.length) {
        throw new Told('customer_name, order_id and images[] are required.');
      }
      if (images.length > 16) throw new Told('Maximum 16 images.');
      return json(await uploadDraftImages(token, customer_name, order_id, images));
    }

    if (action === 'save_moodboard_pdf') {
      const { doc_name, pdf_base64 } = payload;
      if (!pdf_base64) throw new Told('pdf_base64 is required.');
      return json(await saveMoodboardPdf(token, doc_name || '', pdf_base64));
    }

    if (action === 'cleanup_draft') {
      const { folder_id } = payload;
      if (!folder_id) throw new Told('folder_id is required.');
      return json(await cleanupDraft(token, folder_id));
    }

    throw new Told(`Unknown action: ${action}`);
  } catch (err) {
    const status = err instanceof Told ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (status === 500) console.error(err);
    return json({ error: message }, status);
  }
});
