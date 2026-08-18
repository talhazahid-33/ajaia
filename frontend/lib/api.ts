import { getUser } from './auth';

export const USER_ID_HEADER = 'x-user-id';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: ApiMethod;
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getApiUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined');
  }

  return url.replace(/\/$/, '');
}

function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const user = getUser();
    if (user?.id) {
      requestHeaders.set(USER_ID_HEADER, user.id);
    }
  }

  const response = await fetch(`${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      errorMessage(data, response.statusText || 'Request failed'),
      response.status,
      data,
    );
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return api<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return api<T>(path, { ...options, method: 'POST', body });
  },
  postForm<T>(path: string, body: FormData, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return api<T>(path, { ...options, method: 'POST', body });
  },
  put<T>(path: string, body?: unknown, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return api<T>(path, { ...options, method: 'PUT', body });
  },
  patch<T>(path: string, body?: unknown, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return api<T>(path, { ...options, method: 'PATCH', body });
  },
  delete<T>(path: string, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return api<T>(path, { ...options, method: 'DELETE' });
  },
};
