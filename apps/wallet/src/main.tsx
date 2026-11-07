import { Web3AuthProvider } from "@web3auth/no-modal/react";
import { SolanaProvider } from "@web3auth/no-modal/react/solana";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { web3AuthConfig } from "#lib/web3auth";

import { App } from "./app";

import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Web3AuthProvider config={web3AuthConfig}>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </Web3AuthProvider>
  </StrictMode>,
);
