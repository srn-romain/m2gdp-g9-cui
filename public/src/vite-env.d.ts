/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl: string, registration?: ServiceWorkerRegistration) => void;
    onRegisterError?: (error: Error) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}

declare const __APP_VERSION__: string;
