/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MERCHANT_ADDRESS?: string;
  readonly VITE_MERCHANT_NAME?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_SOLANA_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
