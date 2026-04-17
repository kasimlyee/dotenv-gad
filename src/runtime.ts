/**
 * Runtime detection and compatibility utilities for Node.js and Bun.
 *
 * This module provides utilities to detect the current runtime environment
 * and offers optimized implementations based on the runtime.
 */

/**
 * Checks if the current runtime is Bun.
 * @returns true if running in Bun, false otherwise
 */
export function isBun(): boolean {
  return typeof (globalThis as any).Bun !== 'undefined';
}

/**
 * Gets the appropriate environment object for the current runtime.
 * In Bun, this returns Bun.env, in Node.js it returns process.env.
 * Both are compatible, but Bun.env may have better performance in Bun.
 *
 * @returns The environment variables object
 */
export function getEnv(): Record<string, string | undefined> {
  if (isBun() && typeof (globalThis as any).Bun.env !== 'undefined') {
    return (globalThis as any).Bun.env;
  }
  return process.env;
}

/**
 * Gets the current runtime name for logging/debugging purposes.
 * @returns "Bun" or "Node.js"
 */
export function getRuntimeName(): string {
  return isBun() ? 'Bun' : 'Node.js';
}

/**
 * Gets the runtime version string.
 * @returns The version of the current runtime
 */
export function getRuntimeVersion(): string {
  if (isBun()) {
    return (globalThis as any).Bun.version || 'unknown';
  }
  return process.version;
}
