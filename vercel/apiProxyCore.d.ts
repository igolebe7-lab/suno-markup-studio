export function buildProxyUrl(targetOrigin: string | undefined, pathParam: string | string[] | undefined, incomingUrl: string): string;
export function buildProxyPathParam(query: Record<string, string | string[] | undefined>): string[];
export function createProxyHeaders(incomingHeaders: Record<string, string | string[] | undefined>): Headers;
export function shouldForwardBody(method: string): boolean;
export function readRequestBody(request: AsyncIterable<Buffer | Uint8Array | string>): Promise<Buffer>;
export function copyResponseHeaders(fetchHeaders: Headers, response: { setHeader(name: string, value: string | string[]): void }): void;
export function handleProxyRequest(
  request: {
    url: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<Buffer | Uint8Array | string>;
  },
  response: {
    status(code: number): { send(body: Buffer): void; json(body: unknown): void };
    setHeader(name: string, value: string | string[]): void;
  },
  pathParam: string | string[]
): Promise<void>;
