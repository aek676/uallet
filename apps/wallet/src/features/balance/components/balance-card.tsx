import type { Address } from "@solana/kit";
import { RefreshCwIcon } from "lucide-react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

import { usePaymentTokenBalance } from "#/features/balance/hooks/use-payment-token-balance";
import { useSolBalance } from "#/features/balance/hooks/use-sol-balance";
import { formatEuros, formatSol } from "#/lib/format";
import { solanaDevnet } from "#/lib/web3auth";
import { m } from "#/paraglide/messages.js";

/**
 * Below this, warn that network fees may fail. A payment costs ~5,000
 * lamports plus the priority fee, so 0.001 SOL is still dozens of payments.
 */
const LOW_SOL_LAMPORTS = 1_000_000n;

function LoadError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-destructive">{message}</span>
      <Button variant="outline" size="sm" disabled={retrying} onClick={onRetry}>
        <RefreshCwIcon className={retrying ? "animate-spin" : undefined} />
        {m.retry()}
      </Button>
    </div>
  );
}

function SolBalance({ owner }: { owner: Address }) {
  const { lamports, error, refreshing, refresh } = useSolBalance(owner);

  if (error) {
    return (
      <LoadError
        message={m.sol_balance_load_failed()}
        retrying={refreshing}
        onRetry={refresh}
      />
    );
  }

  if (lamports === undefined) {
    return <Skeleton className="h-4 w-32" />;
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">
        {m.sol_balance_for_fees({ amount: formatSol(lamports) })}
      </span>
      {lamports < LOW_SOL_LAMPORTS && (
        <span className="text-destructive">
          {lamports === 0n ? m.sol_balance_empty() : m.sol_balance_low()}
        </span>
      )}
    </div>
  );
}

function TokenBalance({ owner }: { owner: Address }) {
  const { amount, error, refreshing, refresh } = usePaymentTokenBalance(owner);

  // Even with a previous balance: a stale amount must not pass for current.
  if (error) {
    return (
      <LoadError
        message={m.balance_load_failed()}
        retrying={refreshing}
        onRetry={refresh}
      />
    );
  }

  if (amount === undefined) {
    return <Skeleton className="h-10 w-40" />;
  }

  return (
    <p className="text-4xl font-semibold tabular-nums">
      {formatEuros(amount, PAYMENT_TOKEN.decimals)}
    </p>
  );
}

export function BalanceCard({ owner }: { owner: Address }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{m.balance_title()}</CardTitle>
        <CardDescription>
          {m.token_on_network({
            token: PAYMENT_TOKEN.symbol,
            network: solanaDevnet.displayName,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <TokenBalance owner={owner} />
        <SolBalance owner={owner} />
      </CardContent>
    </Card>
  );
}
