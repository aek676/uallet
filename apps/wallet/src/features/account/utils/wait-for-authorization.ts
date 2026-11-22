import { CONNECTOR_EVENTS, CONNECTOR_STATUS } from "@web3auth/no-modal";

/** How long logging out waits for an identity token request to finish. */
export const AUTHORIZATION_WAIT_MS = 10_000;

const SETTLED_EVENTS = [
  CONNECTOR_EVENTS.AUTHORIZED,
  CONNECTOR_EVENTS.CONSENT_REQUIRING,
  CONNECTOR_EVENTS.ERRORED,
  CONNECTOR_EVENTS.DISCONNECTED,
] as const;

type SettledEvent = (typeof SETTLED_EVENTS)[number];

/** What we need from the Web3Auth instance (`useWeb3Auth().web3Auth`). */
export type AuthorizationSource = {
  readonly status: string;
  on(event: SettledEvent, listener: () => void): unknown;
  removeListener(event: SettledEvent, listener: () => void): unknown;
};

/**
 * Resolves once `web3Auth` leaves the `authorizing` status, or after
 * `timeoutMs`, whichever comes first.
 *
 * `getAuthTokenInfo()` (opening an API session) holds `authorizing` for a
 * network request, and `logout()` throws "No wallet is connected" meanwhile.
 * In `@web3auth/no-modal` 11.4.3, a request that fails halfway leaves the
 * status there without emitting anything: the timeout covers that case, and
 * the logout that follows fails.
 */
export function waitForAuthorization(
  web3Auth: AuthorizationSource,
  timeoutMs = AUTHORIZATION_WAIT_MS,
): Promise<void> {
  if (web3Auth.status !== CONNECTOR_STATUS.AUTHORIZING) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const settle = () => {
      clearTimeout(timer);
      for (const event of SETTLED_EVENTS) {
        web3Auth.removeListener(event, settle);
      }
      resolve();
    };
    const timer = setTimeout(settle, timeoutMs);
    for (const event of SETTLED_EVENTS) {
      web3Auth.on(event, settle);
    }
  });
}
