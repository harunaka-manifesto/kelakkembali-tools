/* Kelak Kembali — Google Drive archive for completed moodboards.
 *
 * Mirrors the google-calendar function's auth pattern: the refresh token lives
 * in google_credentials (service-role only), and a fresh access token is minted
 * per invocation. The scope needed is drive.file, which lets this app manage
 * only files it created — nothing else in the user's Drive is touched.
 *
 * Actions:
 *
 *   save_moodboard_pdf   { file_name, pdf_base64 }
 *     -> writes the already-downloaded PDF to the archive folder and returns
 *        a shareable link. Source images never reach Drive.
 *   save_fitting_photo  -> writes a compressed fitting photo by client/order/stage.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API        = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

const ARCHIVE_FOLDER_NAME = 'Kelak Kembali Moodboards';
const FITTINGS_FOLDER_NAME = 'Kelak Kembali Fittings';

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
  const quotedName = String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${quotedName}' and trashed=false` +
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

/* -------------------------------- Actions --------------------------------- */

async function saveMoodboardPdf(
  token: string,
  requestedName: string,
  pdfBase64: string
) {
  const archiveId = await findOrCreateFolder(token, ARCHIVE_FOLDER_NAME);

  const fallbackStamp = new Date().toISOString()
    .replace('T', '-').replace(/[:.]/g, '').replace('Z', '');
  const safeName = String(requestedName || '')
    .split(/[\\/]/).pop()!
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim();
  const fileName = safeName
    ? (safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`)
    : `Moodboard-KelakKembali-${fallbackStamp}.pdf`;

  const raw = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const file = await uploadFile(token, archiveId, fileName, 'application/pdf', raw);

  await setViewPermission(token, file.id);

  return {
    file_id: file.id,
    drive_link: file.webViewLink,
    file_name: fileName
  };
}

async function saveFittingPhoto(
  token: string,
  imageBase64: string,
  mimeType: string,
  requestedName: string,
  customerName: string,
  orderTitle: string,
  stage: string
) {
  const rootId = await findOrCreateFolder(token, FITTINGS_FOLDER_NAME);
  const customerId = await findOrCreateFolder(token, String(customerName || 'Unnamed customer'), rootId);
  const orderId = await findOrCreateFolder(token, String(orderTitle || 'Untitled order'), customerId);
  const stageId = await findOrCreateFolder(token, String(stage || 'Fitting'), orderId);
  const safeName = String(requestedName || 'fitting-photo.jpg')
    .split(/[\\/]/).pop()!
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim() || 'fitting-photo.jpg';
  const raw = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  const file = await uploadFile(token, stageId, safeName, mimeType || 'image/jpeg', raw);

  await setViewPermission(token, file.id);
  return {
    file_id: file.id,
    drive_link: file.webViewLink,
    thumb_link: `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`
  };
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

    if (action === 'save_moodboard_pdf') {
      const { file_name, pdf_base64 } = payload;
      if (!pdf_base64) throw new Told('pdf_base64 is required.');
      return json(await saveMoodboardPdf(token, file_name || '', pdf_base64));
    }

    if (action === 'save_fitting_photo') {
      const { image_base64, mime_type, file_name, customer_name, order_title, stage } = payload;
      if (!image_base64) throw new Told('image_base64 is required.');
      if (!mime_type) throw new Told('mime_type is required.');
      return json(await saveFittingPhoto(
        token, image_base64, mime_type, file_name || '', customer_name || '', order_title || '', stage || ''
      ));
    }

    throw new Told(`Unknown action: ${action}`);
  } catch (err) {
    const status = err instanceof Told ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (status === 500) console.error(err);
    return json({ error: message }, status);
  }
});
