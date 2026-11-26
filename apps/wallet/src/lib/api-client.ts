import { treaty, type Treaty } from "@elysiajs/eden/treaty2";
import type { App } from "api/app";

export function resolveApiBaseUrl(
  baseUrl: string,
  origin: string | undefined = globalThis.location?.origin,
) {
  return new URL(baseUrl, origin).href.replace(/\/+$/, "");
}

export type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl: string;
  fetcher?: Fetcher;
};

export type ApiClient = Treaty.Create<App>;

export function createApiClient({
  baseUrl,
  fetcher,
}: ApiClientOptions): ApiClient {
  return treaty<App>(resolveApiBaseUrl(baseUrl), {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only Bun's `preconnect` is missing, which Treaty never calls
    fetcher: fetcher as typeof fetch | undefined,
    parseDate: false,
  });
}
