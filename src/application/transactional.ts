import { AsyncLocalStorage } from 'node:async_hooks';
import type { Transactor, Tx } from './ports.js';

const txStorage = new AsyncLocalStorage<Tx>();

/**
 * Returns the active request-scoped transaction from AsyncLocalStorage, if any.
 */
export function getCurrentTx(): Tx | undefined {
  return txStorage.getStore();
}

/**
 * Binds a transaction to AsyncLocalStorage for the duration of `fn`.
 */
export function bindTx<T>(tx: Tx, fn: () => Promise<T>): Promise<T> {
  return txStorage.run(tx, fn);
}

/**
 * Executes `fn` inside a transaction with REQUIRED propagation:
 * joins an active ambient transaction if one already exists, otherwise begins a new one.
 */
export async function runWithTx<T>(
  transactor: Transactor,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const existingTx = txStorage.getStore();
  if (existingTx) {
    return fn(existingTx);
  }
  return transactor.execInTransaction((tx) => txStorage.run(tx, () => fn(tx)));
}
