/// <reference types="vite/client" />

/** Versión de la app, inyectada desde package.json en vite.config.ts */
declare const __APP_VERSION__: string;

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
