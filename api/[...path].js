import {
  buildProxyPathParam,
  buildProxyUrl,
  copyResponseHeaders,
  createProxyHeaders,
  readRequestBody,
  shouldForwardBody
} from '../vercel/apiProxyCore.js';

export default async function handler(request, response) {
  let targetUrl;
  try {
    targetUrl = buildProxyUrl(process.env.API_PROXY_TARGET_ORIGIN, buildProxyPathParam(request.query), request.url);
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'API proxy is not configured' });
    return;
  }

  try {
    const proxyResponse = await fetch(targetUrl, {
      method: request.method,
      headers: createProxyHeaders(request.headers),
      body: shouldForwardBody(request.method ?? 'GET') ? await readRequestBody(request) : undefined
    });
    const body = Buffer.from(await proxyResponse.arrayBuffer());
    copyResponseHeaders(proxyResponse.headers, response);
    response.status(proxyResponse.status).send(body);
  } catch {
    response.status(502).json({ message: 'Backend API is unavailable' });
  }
}
