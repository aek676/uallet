import { revalidateLogic, useForm } from "@tanstack/react-form";
import { LoaderCircleIcon } from "lucide-react";
import { useId } from "react";
import { z } from "zod";

import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { universityEmailSchema } from "#/features/auth/utils/university-email";

const emailLoginSchema = z.object({ email: universityEmailSchema });

type EmailLoginProps = {
  onSubmit: (email: string) => Promise<void>;
  disabled: boolean;
  pending: boolean;
};

export function EmailLogin({ onSubmit, disabled, pending }: EmailLoginProps) {
  const emailId = useId();
  const emailErrorId = useId();

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: emailLoginSchema },
    onSubmit: ({ value }) => {
      const { email } = emailLoginSchema.parse(value);
      return onSubmit(email);
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.Field name="email">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={emailId}>Correo</FieldLabel>
              <Input
                id={emailId}
                name={field.name}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@inlumine.ual.es"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                disabled={disabled}
                aria-invalid={isInvalid}
                aria-describedby={isInvalid ? emailErrorId : undefined}
              />
              {isInvalid && (
                <FieldError
                  id={emailErrorId}
                  errors={field.state.meta.errors}
                />
              )}
            </Field>
          );
        }}
      </form.Field>
      <Button type="submit" disabled={disabled}>
        {pending && <LoaderCircleIcon className="animate-spin" />}
        Continuar
      </Button>
    </form>
  );
}
