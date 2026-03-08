export interface ApiResponse {
  status: number;
  body: any;
  headers: Headers;
}

export interface ApiClient {
  get: (path: string) => Promise<ApiResponse>;
  post: (path: string, body?: unknown) => Promise<ApiResponse>;
  patch: (path: string, body?: unknown) => Promise<ApiResponse>;
  delete: (path: string) => Promise<ApiResponse>;
}

/**
 * Create an API client for the test server.
 * Uses native fetch (Node 18+).
 */
export function apiClient(baseUrl: string): ApiClient {
  async function request(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    const url = `${baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    let responseBody: any;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      status: response.status,
      body: responseBody,
      headers: response.headers,
    };
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  };
}
