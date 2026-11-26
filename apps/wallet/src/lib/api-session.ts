import type { Address } from "@solana/kit";

import { ENV } from "#/config/env";
import { createApiClient, type ApiClient } from "#/lib/api-client";

export type IdTokenSource = {
  getAuthTokenInfo(): Promise<{ idToken: string }>;
};

export type ApiSessionParams = { web3Auth: IdTokenSource; address: Address };

export type ApiSession = {
  token: string;
  expiresAt: number;
};

export const SESSION_REFRESH_MARGIN_MS = 60_000;

type SessionResult = Awaited<ReturnType<ApiClient["auth"]["session"]["post"]>>;
type SessionFailure = NonNullable<SessionResult["error"]>;

export type ApiSessionErrorCode = Extract<
  SessionFailure["value"],
  { error: string }
>["error"];

export class ApiSessionError extends Error {
  readonly status: number | undefined;
  readonly code: ApiSessionErrorCode | undefined;

  constructor(
    message: string,
    {
      status,
      code,
      cause,
    }: { status?: number; code?: ApiSessionErrorCode; cause?: unknown } = {},
  ) {
    super(message, { cause });
    this.name = "ApiSessionError";
    this.status = status;
    this.code = code;
  }
}

type CacheEntry = { promise: Promise<ApiSession>; expiresAt?: number };

export function createApiSessions(baseUrl: string) {
  const cache = new Map<Address, CacheEntry>();

  let anonymous: ApiClient | undefined;

  async function requestSession({
    web3Auth,
    address,
  }: ApiSessionParams): Promise<ApiSession> {
    const { idToken } = await web3Auth.getAuthTokenInfo();
    anonymous ??= createApiClient({ baseUrl });
    const { data, error, response, status } = await anonymous.auth.session.post(
      { address },
      { headers: { authorization: `Bearer ${idToken}` } },
    );

    if (error) {
      if (!response) {
        throw new ApiSessionError("Couldn't reach the API", {
          cause: error.value,
        });
      }

      const code =
        error.status === 400 || error.status === 401
          ? error.value.error
          : undefined;
      throw new ApiSessionError(
        `The API refused the session (${status}${code ? `, ${code}` : ""})`,
        { status, code },
      );
    }

    const expiresAt = data ? Date.parse(data.expiresAt) : Number.NaN;
    if (!data?.token || Number.isNaN(expiresAt)) {
      throw new ApiSessionError("Unexpected session response from the API", {
        status,
      });
    }
    return { token: data.token, expiresAt };
  }

  async function openSession(params: ApiSessionParams): Promise<ApiSession> {
    try {
      return await requestSession(params);
    } catch (error) {
      if (error instanceof ApiSessionError) throw error;
      throw new ApiSessionError("Couldn't open the API session", {
        cause: error,
      });
    }
  }

  function getApiSession(params: ApiSessionParams): Promise<ApiSession> {
    const cached = cache.get(params.address);
    if (
      cached &&
      (cached.expiresAt === undefined ||
        Date.now() < cached.expiresAt - SESSION_REFRESH_MARGIN_MS)
    ) {
      return cached.promise;
    }

    const entry: CacheEntry = { promise: openSession(params) };
    cache.set(params.address, entry);
    entry.promise.then(
      (session) => {
        entry.expiresAt = session.expiresAt;
      },
      () => {
        if (cache.get(params.address) === entry) cache.delete(params.address);
      },
    );
    return entry.promise;
  }

  async function invalidate(address: Address, token: string) {
    const cached = cache.get(address);
    if (!cached) return;
    const session = await cached.promise.catch(() => undefined);
    if (session?.token === token && cache.get(address) === cached) {
      cache.delete(address);
    }
  }

  function apiClient(params: ApiSessionParams): ApiClient {
    async function send(input: string | URL | Request, init?: RequestInit) {
      const session = await getApiSession(params);
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${session.token}`);
      const response = await fetch(input, { ...init, headers });
      return { session, response };
    }

    return createApiClient({
      baseUrl,
      fetcher: async (input, init) => {
        const first = await send(input, init);
        if (first.response.status !== 401) return first.response;
        await invalidate(params.address, first.session.token);
        return (await send(input, init)).response;
      },
    });
  }

  return { getApiSession, apiClient };
}

const apiSessions = createApiSessions(ENV.apiUrl);

export const getApiSession = apiSessions.getApiSession;

export const apiClient = apiSessions.apiClient;
