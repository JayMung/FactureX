/**
 * Deno type definitions for Edge Functions
 * This file resolves TypeScript errors in the IDE
 */

// Deno global
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Crypto API (already available in Deno)
declare const crypto: Crypto;
