import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (m: string, hint?: string) => new ApiError(400, "VALIDATION", m, hint);
export const unauthorized = (m = "You need to sign in to do that.") =>
  new ApiError(401, "UNAUTHORIZED", m);
export const forbidden = (m = "You don't have access to this item.") =>
  new ApiError(403, "FORBIDDEN", m);
export const notFound = (m = "We couldn't find that.") => new ApiError(404, "NOT_FOUND", m);
export const conflict = (m: string, hint?: string) => new ApiError(409, "CONFLICT", m, hint);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/**
 * Wraps a route handler so every failure returns a typed, human-readable body
 * instead of a generic 500. Unexpected errors are logged server-side only.
 */
export function route<A extends unknown[]>(
  handler: (req: Request, ...args: A) => Promise<Response>,
) {
  return async (req: Request, ...args: A): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, hint: err.hint } },
          { status: err.status },
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (/SQLITE|database|constraint/i.test(msg)) {
        console.error("[db]", err);
        return NextResponse.json(
          {
            error: {
              code: "DATABASE",
              message: "The library database couldn't complete that change.",
              hint: "Your other data is safe. Try again in a moment.",
            },
          },
          { status: 500 },
        );
      }
      console.error("[api]", err);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL",
            message: "Something went wrong on our side handling that request.",
            hint: "This has been logged. Retrying usually works.",
          },
        },
        { status: 500 },
      );
    }
  };
}
