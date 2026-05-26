import { handleProxyRequest } from '../../vercel/apiProxyCore.js';

export default async function handler(request, response) {
  await handleProxyRequest(request, response, ['projects', request.query.id]);
}
