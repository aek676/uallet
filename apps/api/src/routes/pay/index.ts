import { isAddress } from "@solana/kit";
import { Elysia } from "elysia";

import { errorResponses } from "#/plugins/error-responses";
import { requestLogging } from "#/plugins/request-logging";
import type { SessionAuth } from "#/plugins/session-auth";
import { PayModel } from "#/routes/pay/model";
import type { BuildPayment } from "#/routes/pay/service";

export type PayRoutesDeps = {
  buildPayment: BuildPayment;
  sessionAuth: SessionAuth;
};

export function payRoutes({ buildPayment, sessionAuth }: PayRoutesDeps) {
  return new Elysia()
    .use(requestLogging)
    .use(errorResponses)
    .use(sessionAuth)
    .post(
      "/pay",
      async ({ address, body, log, request, status }) => {
        if (!isAddress(body.account)) {
          return status(400, { error: "invalid_body" as const });
        }

        if (body.account !== address) {
          log.warn({ address, account: body.account }, "Account mismatch");
          return status(403, { error: "account_mismatch" as const });
        }

        const result = await buildPayment(
          address,
          new URL(request.url).searchParams,
        );
        if (!result.ok) {
          switch (result.error) {
            case "invalid_charge":
              log.info({ address, reason: result.reason }, "Invalid charge");
              return status(400, { error: result.error });
            case "rpc_unavailable":
              log.warn(
                { address, err: result.cause },
                "Couldn't read the latest blockhash",
              );
              return status(503, { error: result.error });
          }
        }

        log.info(
          {
            address,
            recipient: result.request.recipient,
            amount: result.request.amount.toString(),
            reference: result.request.reference,
          },
          "Payment transaction built",
        );
        return { transaction: result.transaction };
      },
      {
        auth: true,
        query: PayModel.payQuery,
        body: PayModel.payBody,
        response: {
          200: PayModel.payResponse,
          400: PayModel.payInvalid,
          401: PayModel.payUnauthorized,
          403: PayModel.payForbidden,
          503: PayModel.payUnavailable,
        },
      },
    );
}
