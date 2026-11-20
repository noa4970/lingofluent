/* Web Push (RFC 8291 / RFC 8188 aes128gcm) built on Web Crypto, so it runs on the
   function runtime with no external dependency. */

const encoder = new TextEncoder();

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return {
    privateJwk: JSON.stringify({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }),
    publicKey: bytesToBase64Url(raw),
  };
}

export async function ensureVapidKeys(base44) {
  const listed = await base44.asServiceRole.entities.PushConfig.list();
  const records = Array.isArray(listed) ? listed : listed?.items || [];
  const existing = records[0];
  if (existing?.vapid_public && existing?.vapid_private) {
    return { publicKey: existing.vapid_public, privateJwk: existing.vapid_private };
  }

  const keys = await generateVapidKeys();
  await base44.asServiceRole.entities.PushConfig.create({
    vapid_public: keys.publicKey,
    vapid_private: keys.privateJwk,
  });
  return keys;
}

async function vapidAuthorization(endpoint, vapid) {
  const origin = new URL(endpoint).origin;
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToBase64Url(
    encoder.encode(
      JSON.stringify({
        aud: origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: vapid.subject,
      }),
    ),
  );
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(vapid.privateJwk),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)),
  );

  return `vapid t=${unsigned}.${bytesToBase64Url(signature)}, k=${vapid.publicKey}`;
}

async function encryptPayload(payload, p256dh, auth) {
  const uaPublic = base64UrlToBytes(p256dh);
  const authSecret = base64UrlToBytes(auth);

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256),
  );

  const ikm = await hkdf(
    shared,
    authSecret,
    concat(encoder.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(ikm, salt, encoder.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aesKey,
      concat(encoder.encode(payload), new Uint8Array([2])),
    ),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export async function sendWebPush({ subscription, payload, vapid }) {
  const body = await encryptPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth);
  const authorization = await vapidAuthorization(subscription.endpoint, vapid);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
      Authorization: authorization,
    },
    body,
    signal: AbortSignal.timeout(10000),
  });

  return { ok: response.ok, status: response.status };
}