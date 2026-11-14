import { AUTH_CONNECTION, WALLET_CONNECTORS } from "@web3auth/no-modal";
import { useWeb3Auth } from "@web3auth/no-modal/react";
import { useState } from "react";
import { toast } from "sonner";

import type {
  LoginMethod,
  LoginRequest,
} from "#/features/auth/types/login-methods";
import { m } from "#/paraglide/messages.js";

// Closing the login popup is a choice, not an error worth a red toast.
function isCancelled(error: unknown): boolean {
  return error instanceof Error && /closed|cancel/i.test(error.message);
}

export function useLogin() {
  // Not `useWeb3AuthConnect().connect`: it swallows errors into its `error`
  // state and resolves `undefined`, so a failed login would look like nothing
  // happened. `connectTo` rejects, which lets us tell the user.
  const { web3Auth } = useWeb3Auth();
  const [pending, setPending] = useState<LoginMethod | null>(null);

  async function login(request: LoginRequest) {
    if (!web3Auth) return;
    setPending(request.method);
    try {
      // Called straight from the click/submit handler: browsers block popups
      // opened after other awaits.
      await web3Auth.connectTo(
        WALLET_CONNECTORS.AUTH,
        request.method === "email"
          ? {
              authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
              loginHint: request.email,
            }
          : { authConnection: AUTH_CONNECTION.GOOGLE },
      );
    } catch (error) {
      if (!isCancelled(error)) {
        toast.error(m.wallet_login_failed());
      }
    } finally {
      setPending(null);
    }
  }

  return { login, pending };
}
