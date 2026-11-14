import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useId } from "react";
import { z } from "zod";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { merchant } from "#/config/merchant";
import { conceptSchema } from "#/features/charge/utils/concept";
import {
  type Charge,
  createCharge,
} from "#/features/charge/utils/create-charge";
import { euroAmountSchema } from "#/features/charge/utils/euro-amount";
import { m } from "#/paraglide/messages.js";

const chargeFormSchema = z.object({
  amount: euroAmountSchema,
  concept: conceptSchema,
});

type ChargeFormProps = {
  onCharge: (charge: Charge) => void;
};

export function ChargeForm({ onCharge }: ChargeFormProps) {
  const amountId = useId();
  const amountErrorId = useId();
  const conceptId = useId();
  const conceptHintId = useId();
  const conceptErrorId = useId();

  const form = useForm({
    defaultValues: {
      amount: "",
      concept: "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: chargeFormSchema },
    onSubmit: ({ value }) => {
      const { amount, concept } = chargeFormSchema.parse(value);
      onCharge(createCharge({ merchant, amount, concept }));
    },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{m.merchant_charge_form_title()}</CardTitle>
        <CardDescription>
          {m.merchant_charge_form_description()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="amount">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={amountId}>
                    {m.merchant_charge_form_amount_label()}
                  </FieldLabel>
                  <Input
                    id={amountId}
                    name={field.name}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={m.merchant_charge_form_amount_placeholder()}
                    className="h-14 text-right text-3xl tabular-nums md:text-3xl"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? amountErrorId : undefined}
                  />
                  {isInvalid && (
                    <FieldError
                      id={amountErrorId}
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>
          <form.Field name="concept">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={conceptId}>
                    {m.merchant_charge_form_concept_label()}
                  </FieldLabel>
                  <Input
                    id={conceptId}
                    name={field.name}
                    autoComplete="off"
                    placeholder={m.merchant_charge_form_concept_placeholder()}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    aria-describedby={
                      isInvalid ? conceptErrorId : conceptHintId
                    }
                  />
                  {isInvalid ? (
                    <FieldError
                      id={conceptErrorId}
                      errors={field.state.meta.errors}
                    />
                  ) : (
                    <FieldDescription id={conceptHintId}>
                      {m.merchant_charge_form_concept_hint()}
                    </FieldDescription>
                  )}
                </Field>
              );
            }}
          </form.Field>
          <Button type="submit" size="lg">
            {m.merchant_charge_form_submit()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
