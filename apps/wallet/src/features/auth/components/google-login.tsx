import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";

import { GoogleIcon } from "#/features/auth/components/google-icon";

type GoogleLoginProps = {
  onClick: () => Promise<void>;
  disabled: boolean;
  pending: boolean;
};

export function GoogleLogin({ onClick, disabled, pending }: GoogleLoginProps) {
  return (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={() => void onClick()}
    >
      {pending ? <LoaderCircleIcon className="animate-spin" /> : <GoogleIcon />}
      Continuar con Google
    </Button>
  );
}
