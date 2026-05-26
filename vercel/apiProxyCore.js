const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host'
]);

export function buildProxyUrl(targetOrigin, pathParam, incomingUrl) {
  const origin = String(targetOrigin ?? '').trim().replace(/\/+$/, '');
  if (!origin) throw new Error('API proxy target is not configured');

  const pathSegments = normalizePathSegments(pathParam);
  const path = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  const sourceUrl = new URL(incomingUrl, 'https://vercel.local');
  sourceUrl.searchParams.delete('path');
  sourceUrl.searchParams.delete('...path');
  return `${origin}/api/${path}${sourceUrl.search}`;
}

export function buildProxyPathParam(query) {
  return normalizePathSegments(query.path ?? query['...path']);
}

export function createProxyHeaders(incomingHeaders) {
  const headers = new Headers();
  Object.entries(incomingHeaders).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (hopByHopHeaders.has(normalizedKey) || value == null) return;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  });
  return headers;
}

export function shouldForwardBody(method) {
  const normalized = method.toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD';
}

export async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function copyResponseHeaders(fetchHeaders, response) {
  const getSetCookie = fetchHeaders.getSetCookie?.bind(fetchHeaders);
  const setCookies = getSetCookie ? getSetCookie() : [];

  fetchHeaders.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === 'set-cookie' || normalizedKey === 'content-encoding' || normalizedKey === 'transfer-encoding') return;
    response.setHeader(key, value);
  });

  if (setCookies.length) response.setHeader('set-cookie', setCookies);
}

function normalizePathSegments(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.map(String).filter(Boolean);
  if (typeof pathParam === 'string' && pathParam.length) return pathParam.split('/').filter(Boolean);
  return [];
}
