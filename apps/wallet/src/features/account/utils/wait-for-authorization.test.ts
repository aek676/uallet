import { EventEmitter } from "node:events";

import { CONNECTOR_EVENTS, CONNECTOR_STATUS } from "@web3auth/no-modal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTHORIZATION_WAIT_MS,
  waitForAuthorization,
} from "#/features/account/utils/wait-for-authorization";

class FakeWeb3Auth extends EventEmitter {
  constructor(public status: string) {
    super();
  }
}

function track(promise: Promise<void>) {
  const state = { settled: false };
  void promise.then(() => {
    state.settled = true;
  });
  return state;
}

describe("waitForAuthorization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves at once when not authorizing", async () => {
    const web3Auth = new FakeWeb3Auth(CONNECTOR_STATUS.CONNECTED);
    await expect(waitForAuthorization(web3Auth)).resolves.toBeUndefined();
    expect(web3Auth.eventNames()).toEqual([]);
  });

  it.each([
    CONNECTOR_EVENTS.AUTHORIZED,
    CONNECTOR_EVENTS.CONSENT_REQUIRING,
    CONNECTOR_EVENTS.ERRORED,
    CONNECTOR_EVENTS.DISCONNECTED,
  ])("resolves on %s and removes its listeners", async (event) => {
    const web3Auth = new FakeWeb3Auth(CONNECTOR_STATUS.AUTHORIZING);
    const state = track(waitForAuthorization(web3Auth));

    await vi.advanceTimersByTimeAsync(AUTHORIZATION_WAIT_MS - 1);
    expect(state.settled).toBe(false);

    web3Auth.emit(event);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.settled).toBe(true);
    expect(web3Auth.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up after the timeout, if nothing is emitted", async () => {
    const web3Auth = new FakeWeb3Auth(CONNECTOR_STATUS.AUTHORIZING);
    const state = track(waitForAuthorization(web3Auth, 500));

    await vi.advanceTimersByTimeAsync(499);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
    expect(web3Auth.eventNames()).toEqual([]);
  });
});
