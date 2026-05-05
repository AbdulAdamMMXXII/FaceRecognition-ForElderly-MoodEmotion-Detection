// src/env.d.ts
// Provide minimal typings for `import.meta.env` used by Vite
// This prevents TS errors like: Property 'env' does not exist on type 'ImportMeta'.

interface ImportMetaEnv {
  readonly DEV?: boolean;
  readonly MODE?: string;
  readonly PROD?: boolean;
  // allow any other Vite env vars (e.g. VITE_...)
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
