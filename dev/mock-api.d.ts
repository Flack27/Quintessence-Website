import type { Plugin } from "vite";
/** Stable fake identity used for every guide "published" through this mock. */
export declare const DEV_USER: {
    id: string;
    username: string;
    avatar: string | null;
};
/**
 * Dev-only stand-in for the Vercel serverless functions under api/, so the whole
 * publish -> view -> delete lifecycle works with just `npm run dev` — no Vercel CLI,
 * Discord app or GitHub token needed. Writes real files into contents/, so the same
 * content.ts glob-loader Vite already watches picks guides up like any hand-written one.
 */
export declare function mockApiPlugin(): Plugin;
