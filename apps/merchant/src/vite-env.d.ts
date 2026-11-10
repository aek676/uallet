/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MERCHANT_ADDRESS?: string;
  readonly VITE_MERCHANT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
