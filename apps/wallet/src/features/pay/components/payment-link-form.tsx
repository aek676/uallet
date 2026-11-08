import type { Address } from "@solana/kit";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useId } from "react";
import { z } from "zod";

import type { TransferRequest } from "@repo/payments/solana-pay";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { createPaymentLinkSchema } from "#/features/pay/utils/payment-link";

type PaymentLinkFormProps = {
  payer: Address;
  onRequest: (request: TransferRequest) => void;
};

export function PaymentLinkForm({ payer, onRequest }: PaymentLinkFormProps) {
  const linkId = useId();
  const linkErrorId = useId();

  const schema = z.object({ link: createPaymentLinkSchema(payer) });

  const form = useForm({
    defaultValues: { link: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: ({ value }) => {
      onRequest(schema.parse(value).link);
    },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Pagar</CardTitle>
        <CardDescription>Pega el enlace de pago del comercio.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <form.Field name="link">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={linkId}>Enlace de pago</FieldLabel>
                  <Input
                    id={linkId}
                    name={field.name}
                    autoComplete="off"
                    placeholder="solana:…"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? linkErrorId : undefined}
                  />
                  {isInvalid && (
                    <FieldError
                      id={linkErrorId}
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>
          <Button type="submit">Continuar</Button>
        </form>
      </CardContent>
    </Card>
  );
}
