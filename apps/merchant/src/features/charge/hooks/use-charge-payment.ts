import { useAction, useClient } from "@solana/react";
import { useEffect, useState } from "react";

import { PAYMENT_TOKEN } from "@repo/payments/config";

import type { Charge } from "#/features/charge/utils/create-charge";
import { createRpcPaymentSource } from "#/features/charge/utils/rpc-payment-source";
import {
  type DetectedPayment,
  waitForPayment,
} from "#/features/charge/utils/wait-for-payment";
import type { SolanaClient } from "#/lib/solana-client";
import { chargeTimings, toChargeTiming } from "#/stores/charge-timings";

export type ChargePaymentState =
  | { status: "waiting" }
  /** A transaction mentions the charge and is being validated. */
  | { status: "checking" }
  | { status: "paid"; payment: DetectedPayment }
  /** We stopped listening (connection, RPC...): `retry` listens again. */
  | { status: "error" };

/**
 * Watches the chain for the payment of `charge` while mounted. Mount it once
 * per charge (`key`): it doesn't start over when the charge changes.
 *
 * It keeps how each payment was detected in `chargeTimings`.
 */
export function useChargePayment(charge: Charge) {
  const client = useClient<SolanaClient>();
  const [checking, setChecking] = useState(false);

  const { dispatch, data, isError, isRunning } = useAction(
    async (abortSignal: AbortSignal) => {
      const payment = await waitForPayment(
        createRpcPaymentSource(client),
        charge.request,
        PAYMENT_TOKEN,
        { abortSignal, onChecking: setChecking },
      );
      chargeTimings.add(toChargeTiming(payment));
      return payment;
    },
  );

  // Listen while mounted: `useAction` aborts the call when it unmounts.
  useEffect(() => {
    dispatch();
  }, [dispatch]);

  function state(): ChargePaymentState {
    if (data) return { status: "paid", payment: data };
    if (isRunning) return { status: checking ? "checking" : "waiting" };
    // Idle only before the effect runs.
    return { status: isError ? "error" : "waiting" };
  }

  return {
    state: state(),
    /** Listens again. It also finds a payment that landed in the meantime. */
    retry: dispatch,
  };
}
