type SampleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface SampleStoreConfig<T> {
  /** Storage key. Change it when the shape of the samples changes. */
  key: string;
  /** How many samples to keep: the newest ones. */
  limit: number;
  /**
   * Validates one stored sample, or `null` to drop it. What comes back from
   * storage is untrusted: an older version of the app or anyone with the
   * devtools open wrote it.
   */
  parse: (value: unknown) => T | null;
  /** Defaults to `localStorage`. `null` keeps the samples in memory only. */
  storage?: SampleStorage | null;
}

export interface SampleStore<T> {
  /**
   * The samples, oldest first. The same array until they change, as
   * `useSyncExternalStore` requires.
   */
  getSnapshot(): readonly T[];
  subscribe(listener: () => void): () => void;
  add(sample: T): void;
  clear(): void;
}

function browserStorage(): SampleStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Reading the property throws when the browser blocks storage.
    return null;
  }
}

/**
 * The last `limit` samples of something we measure, kept across reloads on
 * this device. Storage failures (blocked, full, unreadable data) never throw:
 * metrics must not break a payment.
 */
export function createSampleStore<T>({
  key,
  limit,
  parse,
  storage,
}: SampleStoreConfig<T>): SampleStore<T> {
  const listeners = new Set<() => void>();
  let samples: readonly T[] | undefined;

  // Resolved on first use: importing the module must not touch storage.
  function resolveStorage(): SampleStorage | null {
    return storage === undefined ? browserStorage() : storage;
  }

  function read(): readonly T[] {
    try {
      const stored: unknown = JSON.parse(
        resolveStorage()?.getItem(key) ?? "[]",
      );
      if (!Array.isArray(stored)) return [];
      return stored
        .map((value: unknown) => parse(value))
        .filter((sample) => sample !== null)
        .slice(-limit);
    } catch {
      return [];
    }
  }

  function write(next: readonly T[]) {
    samples = next;
    try {
      if (next.length === 0) {
        resolveStorage()?.removeItem(key);
      } else {
        resolveStorage()?.setItem(key, JSON.stringify(next));
      }
    } catch {
      // Kept in memory for this session.
    }
    for (const listener of listeners) listener();
  }

  function getSnapshot(): readonly T[] {
    samples ??= read();
    return samples;
  }

  return {
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    add(sample) {
      write([...getSnapshot(), sample].slice(-limit));
    },
    clear() {
      write([]);
    },
  };
}
