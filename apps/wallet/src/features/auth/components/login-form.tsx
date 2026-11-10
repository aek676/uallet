import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";

import { EmailLogin } from "#/features/auth/components/email-login";
import { GoogleLogin } from "#/features/auth/components/google-login";
import { useLogin } from "#/features/auth/hooks/use-login";

function OrSeparator() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <Separator className="flex-1" />o<Separator className="flex-1" />
    </div>
  );
}

export function LoginForm() {
  const { login, pending } = useLogin();
  const disabled = pending !== null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Entra en Uallet</CardTitle>
        <CardDescription>
          Paga en el campus con tu correo de la universidad. Creamos tu wallet
          al entrar por primera vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <EmailLogin
          onSubmit={(email) => login({ method: "email", email })}
          disabled={disabled}
          pending={pending === "email"}
        />
        <OrSeparator />
        <GoogleLogin
          onClick={() => login({ method: "google" })}
          disabled={disabled}
          pending={pending === "google"}
        />
      </CardContent>
    </Card>
  );
}
