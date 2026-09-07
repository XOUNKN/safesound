import type { ApiErrorBody, ApiErrorCode } from "./types";

export class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

const OFFLINE = new RequestError(
  0,
  "NETWORK",
  "You appear to be offline.",
  "Reconnect and your change will go through.",
);

type Options = { signal?: AbortSignal; body?: unknown };

async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      credentials: "same-origin",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw OFFLINE;
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const body = payload as ApiErrorBody | null;
    throw new RequestError(
      res.status,
      body?.error?.code ?? "INTERNAL",
      body?.error?.message ?? `Request failed (${res.status}).`,
      body?.error?.hint,
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, { signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>("POST", path, { body: body ?? {}, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>("PUT", path, { body: body ?? {}, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>("PATCH", path, { body: body ?? {}, signal }),
  del: <T>(path: string, signal?: AbortSignal) => request<T>("DELETE", path, { signal }),
};

/** Turns any thrown value into something worth showing a person. */
export function describeError(err: unknown): { message: string; hint?: string } {
  if (err instanceof RequestError) return { message: err.message, hint: err.hint };
  if (err instanceof Error) return { message: err.message };
  return { message: "Something unexpected happened." };
}
