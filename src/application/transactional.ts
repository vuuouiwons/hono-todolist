import { AsyncLocalStorage } from 'node:async_hooks';
import type { Transactor, Tx } from './ports.js';

const txStorage = new AsyncLocalStorage<Tx>();

export interface TransactionalHost {
  readonly transactor: Transactor;
}

/**
 * Returns the active transaction from AsyncLocalStorage, if any.
 */
export function getCurrentTx(): Tx | undefined {
  return txStorage.getStore();
}

/**
 * Executes `fn` inside a transaction with NestJS/Spring-style REQUIRED propagation:
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

/**
 * NestJS-style `@Transactional()` method decorator (ES Stage 3 Decorator).
 * Wraps the decorated async method in `runWithTx(this.transactor, ...)` so callers
 * share or open an ACID transaction without explicit boilerplate.
 */
export function Transactional() {
  return function <This extends TransactionalHost, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    return async function (this: This, ...args: Args): Promise<Return> {
      return runWithTx(this.transactor, () => originalMethod.apply(this, args));
    };
  };
}
