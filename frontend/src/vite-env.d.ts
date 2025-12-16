/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ENABLE_CHAT: string;
  readonly VITE_ENABLE_AUDIO: string;
  readonly VITE_ENABLE_COLLABORATION: string;
  readonly VITE_ANALYTICS_ENABLED: string;
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
