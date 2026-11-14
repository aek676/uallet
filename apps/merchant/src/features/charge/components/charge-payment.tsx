import { ChargePaid } from "#/features/charge/components/charge-paid";
import { ChargeQr } from "#/features/charge/components/charge-qr";
import { useChargePayment } from "#/features/charge/hooks/use-charge-payment";
import type { Charge } from "#/features/charge/utils/create-charge";

type ChargePaymentProps = {
  charge: Charge;
  onClose: () => void;
};

/**
 * A charge from the QR code until it's paid. Mount it with the charge's `url`
 * as `key`: the payment watcher lives as long as this component.
 */
export function ChargePayment({ charge, onClose }: ChargePaymentProps) {
  const { state, retry } = useChargePayment(charge);

  if (state.status === "paid") {
    return (
      <ChargePaid charge={charge} payment={state.payment} onDone={onClose} />
    );
  }

  return (
    <ChargeQr
      charge={charge}
      status={state.status}
      onRetry={retry}
      onCancel={onClose}
    />
  );
}
