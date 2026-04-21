/**
 * Graceful shutdown manager for env-vault.
 * Registers cleanup handlers and coordinates orderly teardown.
 */

export interface ShutdownHandler {
  name: string;
  priority: number; // lower = runs first
  fn: () => Promise<void> | void;
}

export interface GracefulStore {
  handlers: Map<string, ShutdownHandler>;
  isShuttingDown: boolean;
  timeoutMs: number;
}

export function createGracefulStore(timeoutMs = 5000): GracefulStore {
  return {
    handlers: new Map(),
    isShuttingDown: false,
    timeoutMs,
  };
}

export function registerHandler(
  store: GracefulStore,
  handler: ShutdownHandler
): void {
  if (store.handlers.has(handler.name)) {
    throw new Error(`Handler "${handler.name}" is already registered`);
  }
  store.handlers.set(handler.name, handler);
}

export function deregisterHandler(store: GracefulStore, name: string): boolean {
  return store.handlers.delete(name);
}

export function getHandlers(store: GracefulStore): ShutdownHandler[] {
  return Array.from(store.handlers.values()).sort(
    (a, b) => a.priority - b.priority
  );
}

export async function runShutdown(store: GracefulStore): Promise<{
  succeeded: string[];
  failed: Array<{ name: string; error: string }>;
}> {
  if (store.isShuttingDown) {
    return { succeeded: [], failed: [] };
  }
  store.isShuttingDown = true;

  const succeeded: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];
  const handlers = getHandlers(store);

  for (const handler of handlers) {
    try {
      const result = handler.fn();
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), store.timeoutMs)
      );
      await Promise.race([Promise.resolve(result), timeout]);
      succeeded.push(handler.name);
    } catch (err) {
      failed.push({
        name: handler.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { succeeded, failed };
}

export function isShuttingDown(store: GracefulStore): boolean {
  return store.isShuttingDown;
}
